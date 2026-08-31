export interface ThreadUser {
  id: number;
  username: string;
  name: string;
  profile_picture: string | null;
}

export interface Thread {
  [x: string]: any;
  id: number;
  content: string;
  created_at: string;
  image: string[];
  user: ThreadUser;
  likes: number;
  reply: number;
  isLiked: boolean;
}

export type CreateThreadPayload = {
  content: string;
  image?: string[]; 
};
