import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const MONGODB_URI = process.env.MONGONDB_URI || "mongodb+srv://deivijunior3223_db_user:eYhQCZtlGOsdZmJ3@cluster0.uadytjb.mongodb.net/ferreteria_db?retryWrites=true&w=majority";
export const JWT_SECRET = process.env.JWT_SECRET || "secret_KEY_123";
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';