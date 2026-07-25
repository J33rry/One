import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(5000),

    DATABASE_URL: z.string().url(),

    REDIS_URL: z.string().default("redis://localhost:6379"),

    SESSION_SECRET: z.string().min(32),
    JWT_SECRET: z.string().min(32),

    GOOGLE_CLIENT_ID: z.string().optional(), // Make optional so server doesn't crash immediately without it in dev
    CORS_ORIGIN: z.string().default("http://localhost:3000"),

    // LiveKit Config
    LIVEKIT_URL: z.string().url().default("http://localhost:7880"),
    LIVEKIT_API_KEY: z.string().default("devkey"),
    LIVEKIT_API_SECRET: z.string().default("secret"),

    // Cloudinary Config
    CLOUDINARY_CLOUD_NAME: z.string().default("demo"),
    CLOUDINARY_API_KEY: z.string().default("test_key"),
    CLOUDINARY_API_SECRET: z.string().default("test_secret"),

    // Storage — stubbed, optional until wired to S3
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    UPLOAD_DIR: z.string().default("./uploads"),
});

export const env = envSchema.parse(process.env);
