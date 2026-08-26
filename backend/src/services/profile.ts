import { prisma } from "../prisma/client";
import type { UpdateProfileInput } from "../types/profileType";

export const getProfileByUserId = async (userId: number) => {
    const [user, followersCount, followingCount] = await Promise.all([
        prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            photo_profile: true,
            bio: true,
            created_at: true,
            updated_at: true,
        },
        }),
        prisma.following.count({ where: { following_id: userId } }),
        prisma.following.count({ where: { follower_id: userId } }),
    ]);

    if (!user) throw new Error("USER NOT FOUND");

    // ✅ mapping ke bentuk "MeUser" yang dipakai frontend
    return {
        id: user.id,
        username: user.username,
        name: user.full_name,
        email: user.email,
        avatar: user.photo_profile,
        bio: user.bio,
        follower_count: followersCount,
        following_count: followingCount,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };
};


export const updateMyProfile = async (userId: number, input: UpdateProfileInput) => {
    if (input.username && input.username.trim().length < 3) {
        throw new Error("USERNAME TOO SHORT");
    }
    if (input.full_name && input.full_name.trim().length < 2) {
        throw new Error("NAME TOO SHORT");
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
        full_name: input.full_name,
        username: input.username,
        bio: input.bio ?? undefined,
        photo_profile: input.photo_profile ?? undefined,

        update_by: userId,
        },
        select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        photo_profile: true,
        bio: true,
        created_at: true,
        updated_at: true,
        },
    });

    const [followersCount, followingCount] = await Promise.all([
        prisma.following.count({ where: { following_id: userId } }),
        prisma.following.count({ where: { follower_id: userId } }),
    ]);

    return {
        id: user.id,
        username: user.username,
        name: user.full_name,
        email: user.email,
        avatar: user.photo_profile,
        bio: user.bio,
        follower_count: followersCount,
        following_count: followingCount,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };
};


export async function getUserProfileByUsernameService(params: {
    viewerId: number;
    username: string;
    }) {
    const { viewerId, username } = params;

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
        id: true,
        username: true,
        full_name: true,
        photo_profile: true,
        bio: true,
        },
    });

    if (!user) {
        return { success: false as const, reason: "USER_NOT_FOUND" as const };
    }

    const [followersCount, followingCount, rel] = await Promise.all([
        prisma.following.count({ where: { following_id: user.id } }),
        prisma.following.count({ where: { follower_id: user.id } }),
        prisma.following.findFirst({
        where: { follower_id: viewerId, following_id: user.id },
        select: { id: true },
        }),
    ]);

    return {
        success: true as const,
        data: {
        id: String(user.id),
        username: user.username,
        name: user.full_name,
        avatar: user.photo_profile ?? "",
        bio: user.bio ?? "",
        follower_count: followersCount,
        following_count: followingCount,
        is_following: Boolean(rel),
        },
    };
}


