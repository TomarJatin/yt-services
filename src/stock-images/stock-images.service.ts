/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockImageDto, SearchStockImageDto } from './dto';
import { FetchStockImagesDto, SortOrder } from './dto/fetch-stock-images.dto';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';

@Injectable()
export class StockImagesService {
  private openai: OpenAI;
  private readonly logger = new Logger(StockImagesService.name);

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
      defaultQuery: { 'api-version': process.env.OPENAI_API_VERSION },
      defaultHeaders: { 'api-key': process.env.OPENAI_API_KEY },
    });
  }

  async getEmbedding(text: string) {
    try {
      const response = await this.openai.embeddings.create({
        input: text,
        model: 'text-embedding-3-small',
      });
      return response.data[0].embedding;
    } catch (error: any) {
      this.logger.error('Embedding Error', { error });
      throw error;
    }
  }

  /**
   * Generate embeddings for text using OpenAI API
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    const embeddings = await this.getEmbedding(text);
    return embeddings;
  }

  /**
   * Create a new stock image with embeddings
   */
  async create(createStockImageDto: CreateStockImageDto) {
    const { channel_id, name, description, url, tags } = createStockImageDto;
    this.logger.log(
      `Creating stock image for channel: ${channel_id}, name: ${name}`,
    );

    try {
      // Generate content for embedding from name, description and tags
      const embeddingContent = [name, description || '', ...tags].join(' ');

      // Generate embeddings
      const embeddings = await this.generateEmbeddings(embeddingContent);
      this.logger.log(`Generated embeddings with length: ${embeddings.length}`);

      // If we have no embeddings, use the fallback method
      if (!embeddings || embeddings.length === 0) {
        throw new Error('No embeddings generated');
      }

      // Create the stock image with embeddings
      // Using Prisma's raw query for vector data
      const vectorString = `[${embeddings.join(',')}]`;
      this.logger.log(
        `Using vector string with length ${embeddings.length}: ${vectorString.substring(0, 50)}...`,
      );

      return this.prisma.$executeRaw`
        INSERT INTO stock_images (
          channel_id, name, description, url, embedding, tags, created_at, updated_at
        ) VALUES (
          ${channel_id},
          ${name}, 
          ${description}, 
          ${url}, 
          ${Prisma.raw(`'${vectorString}'::vector`)}, 
          ${Prisma.raw(`ARRAY[${tags.map((tag) => `'${tag}'`).join(',')}]`)}, 
          NOW(), 
          NOW()
        ) RETURNING *
      `;
    } catch (error) {
      this.logger.error('Error creating stock image:', error);

      // Fallback method using Prisma client when raw query fails
      // This won't include embeddings but allows basic functionality to work
      try {
        this.logger.log(
          'Attempting fallback creation method without embeddings',
        );
        const result = await this.prisma.stock_images.create({
          data: {
            channel_id,
            name,
            description,
            url,
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
   * Search for stock images based on query using vector search
   */
  async search(searchDto: SearchStockImageDto) {
    console.log('searchDto...', JSON.stringify(searchDto));
    const { channel_id, query, limit = 10 } = searchDto;

    // Generate embeddings for the search query
    const embeddings = await this.generateEmbeddings(query);

    // Perform vector search using raw SQL query with channel_id filter
    const result = await this.prisma.$queryRaw`
      SELECT id, channel_id, name, description, url, tags, created_at, updated_at
      FROM stock_images
      WHERE deleted_at IS NULL
      AND channel_id = ${channel_id}
      ORDER BY embedding <-> ${Prisma.raw(`'[${embeddings.join(',')}]'::vector`)}
      LIMIT ${limit}
    `;

    console.log('result...', result);

    return result;
  }

  /**
   * Fetch stock images with filters, sorting and pagination
   */
  async fetchAll(fetchDto: FetchStockImagesDto) {
    const {
      channel_id,
      search,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = SortOrder.DESC,
    } = fetchDto;

    // Calculate offset for pagination and ensure numeric values
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where conditions
    const whereConditions: Prisma.stock_imagesWhereInput = {
      deleted_at: null,
      channel_id: channel_id,
    };

    // Add search condition if provided (searching in name and description)
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add tags filter if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      whereConditions.tags = {
        hasSome: tags,
      };
    }

    // Execute count query for total results
    const totalCount = await this.prisma.stock_images.count({
      where: whereConditions,
    });

    // Build order by condition
    const validSortFields = ['created_at', 'name'];
    const actualSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'created_at';

    // Create the order by object
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[actualSortBy] = sortOrder === SortOrder.ASC ? 'asc' : 'desc';

    // Execute main query
    const items = await this.prisma.stock_images.findMany({
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
