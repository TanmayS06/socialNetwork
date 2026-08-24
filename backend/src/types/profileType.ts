export type UpdateProfileInput = {
    full_name?: string;
    username?: string;
    bio?: string | null;
    photo_profile?: string | null;
};

export type MeUser = {
    username: string;
    name: string;
    email: string;
    avatar: string | null; 
    bio: string | null;
    follower_count: number;
    following_count: number;
    created_at: Date;
    updated_at: Date;
};
