import type { ThreadUser } from "./thread";

export type Reply = {
  id: number;
  content: string;
  created_at: string;
  user: ThreadUser;
};

export interface ReplyItem {
  id: number;
  content: string;
  created_at: string;
  user: ThreadUser;
  likes: number;
  isLiked: boolean;
  image?: string[]; 
}