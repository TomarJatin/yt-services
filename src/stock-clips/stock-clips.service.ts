import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockClipDto, SearchStockClipDto } from './dto';
import { FetchStockClipsDto, SortOrder } from './dto/fetch-stock-clips.dto';
import { GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockClipsService {
  private readonly logger = new Logger(StockClipsService.name);
  private genAI: GoogleGenAI;
  private embeddingModel = 'gemini-embedding-exp-03-07';

  constructor(private prisma: PrismaService) {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }

  /**
   * Generate embeddings for text using Gemini API
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      console.log('generating embeddings', text);
      const response = await this.genAI.models.embedContent({
        model: this.embeddingModel,
        contents: text,
      });
      console.log('embeddings response', response);

      // Return empty array if embeddings are undefined
      if (!response.embeddings) {
        this.logger.warn('No embeddings returned from API');
        return [];
      }

      // Make sure we're getting an array of numbers
      const embeddings = response.embeddings;
      console.log('embeddings', embeddings);

      // Expected dimension in PostgreSQL schema
      const EXPECTED_DIMENSIONS = 1536;
      let embeddingValues: number[] = [];

      // Handle the case where embeddings is an array with a values property
      if (Array.isArray(embeddings) && embeddings.length > 0) {
        // Check if the first element has a values property (which is an array of numbers)
        if (
          embeddings[0] &&
          embeddings[0].values &&
          Array.isArray(embeddings[0].values)
        ) {
          this.logger.log(
            `Found embeddings with ${embeddings[0].values.length} values`,
          );
          embeddingValues = embeddings[0].values;
        }
        // Check if first element is a number (direct array of numbers)
        else if (typeof embeddings[0] === 'number') {
          embeddingValues = embeddings as number[];
        } else {
          this.logger.warn(
            'Embeddings not in expected format, trying to extract values',
          );
          // Try JSON.stringify to see the structure
          this.logger.warn(
            `Embeddings structure: ${JSON.stringify(embeddings).substring(0, 200)}...`,
          );
          return [];
        }
      }

      // Handle dimension mismatch - resize the embedding vector to expected dimensions
      if (embeddingValues.length !== EXPECTED_DIMENSIONS) {
        this.logger.warn(
          `Dimension mismatch: got ${embeddingValues.length}, expected ${EXPECTED_DIMENSIONS}. Adjusting vector size...`,
        );

        if (embeddingValues.length > EXPECTED_DIMENSIONS) {
          // Truncate the vector if it's too large
          embeddingValues = embeddingValues.slice(0, EXPECTED_DIMENSIONS);
          this.logger.log(
            `Truncated vector to ${embeddingValues.length} dimensions`,
          );
        } else {
          // Pad the vector with zeros if it's too small
          while (embeddingValues.length < EXPECTED_DIMENSIONS) {
            embeddingValues.push(0);
          }
          this.logger.log(
            `Padded vector to ${embeddingValues.length} dimensions`,
          );
        }
      }

      return embeddingValues;
    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      // Return empty array as fallback instead of throwing
      // This allows the app to continue functioning even if the API is not enabled
      return [];
    }
  }

  /**
   * Create a new stock clip with embeddings
   */
  async create(createStockClipDto: CreateStockClipDto) {
    const { name, description, url, genre, duration, tags } =
      createStockClipDto;
    console.log(
      'creating stock clip',
      name,
      description,
      url,
      genre,
      duration,
      tags,
    );

    try {
      // Generate content for embedding from name, description and tags
      const embeddingContent = [name, description || '', genre, ...tags].join(
        ' ',
      );

      // Generate embeddings
      const embeddings = await this.generateEmbeddings(embeddingContent);
      console.log('embeddings length', embeddings.length);

      // Debug the embeddings
      this.logger.log(`Generated embeddings with length: ${embeddings.length}`);

      // If we have no embeddings, use the fallback method
      if (!embeddings || embeddings.length === 0) {
        throw new Error('No embeddings generated');
      }

      // Create the stock clip with embeddings
      // Using Prisma's raw query for vector data
      const vectorString = `[${embeddings.join(',')}]`;
      this.logger.log(
        `Using vector string with length ${embeddings.length}: ${vectorString.substring(0, 50)}...`,
      );

      return this.prisma.$executeRaw`
        INSERT INTO stock_clips (
          name, description, url, genre, duration, embedding, tags, created_at, updated_at
        ) VALUES (
          ${name}, 
          ${description}, 
          ${url}, 
          ${genre}, 
          ${duration}, 
          ${Prisma.raw(`'${vectorString}'::vector`)}, 
          ${Prisma.raw(`ARRAY[${tags.map((tag) => `'${tag}'`).join(',')}]`)}, 
          NOW(), 
          NOW()
        ) RETURNING *
      `;
    } catch (error) {
      this.logger.error('Error creating stock clip:', error);

      // Fallback method using Prisma client when raw query fails
      // This won't include embeddings but allows basic functionality to work
      try {
        this.logger.log(
          'Attempting fallback creation method without embeddings',
        );
        const result = await this.prisma.stock_clips.create({
          data: {
            name,
            description,
            url,
            genre,
            duration,
            tags,
          },
        });
        return result;
      } catch (fallbackError) {
        this.logger.error('Fallback creation method failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Search for stock clips based on query using vector search
   */
  async search(searchDto: SearchStockClipDto) {
    const { query, limit = 10, genre } = searchDto;

    // Generate embeddings for the search query
    const embeddings = await this.generateEmbeddings(query);

    // Perform vector search using raw SQL query
    const genreFilter = genre ? Prisma.sql`AND genre = ${genre}` : Prisma.empty;

    return this.prisma.$queryRaw`
      SELECT id, name, description, url, genre, duration, tags, created_at, updated_at
      FROM stock_clips
      WHERE deleted_at IS NULL
      ${genreFilter}
      ORDER BY embedding <-> ${Prisma.raw(`'[${embeddings.join(',')}]'::vector`)}
      LIMIT ${limit}
    `;
  }

  /**
   * Fetch stock clips with filters, sorting and pagination
   */
  async fetchAll(fetchDto: FetchStockClipsDto) {
    const {
      search,
      genre,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = SortOrder.DESC,
    } = fetchDto;
    console.log('fetching all stock clips', search, genre, tags, page, limit);

    // Calculate offset for pagination and ensure numeric values
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where conditions
    const whereConditions: Prisma.stock_clipsWhereInput = {
      deleted_at: null,
    };

    // Add search condition if provided (searching in name and description)
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add genre filter if provided
    if (genre) {
      whereConditions.genre = genre;
    }

    // Add tags filter if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      whereConditions.tags = {
        hasSome: tags,
      };
    }

    // Execute count query for total results
    const totalCount = await this.prisma.stock_clips.count({
      where: whereConditions,
    });

    // Build order by condition
    const validSortFields = ['created_at', 'name', 'genre', 'duration'];
    const actualSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'created_at';

    // Create the order by object
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[actualSortBy] = sortOrder === SortOrder.ASC ? 'asc' : 'desc';

    // Execute main query
    const items = await this.prisma.stock_clips.findMany({
      where: whereConditions,
      skip,
      take: limitNumber,
      orderBy,
    });

    // Return paginated result
    return {
      items,
      meta: {
        totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    };
  }
}
