/**
 * Centralized cache key definitions.
 * All Redis keys are prefixed to avoid collision.
 */
export const cacheKeys = {
    /** Feed of all threads, paginated and viewer-isolated */
    threadsFeed: (
        page: string | number = 1,
        limit: string | number = 10,
        viewerId: string | number = "guest"
    ) => `threads:feed:viewer:${viewerId}:page:${page}:limit:${limit}`,

    /** Single thread detail, viewer-isolated */
    threadDetail: (
        id: string | number,
        viewerId: string | number = "guest"
    ) => `threads:detail:${id}:viewer:${viewerId}`,

    /** Threads created by the authenticated user, paginated */
    myThreads: (
        userId: string | number,
        page: string | number = 1,
        limit: string | number = 10
    ) => `threads:me:${userId}:page:${page}:limit:${limit}`,

    /** Threads created by a specific user, viewer-isolated and paginated */
    userThreads: (
        userId: string | number,
        viewerId: string | number = "guest",
        page: string | number = 1,
        limit: string | number = 10
    ) => `threads:user:${userId}:viewer:${viewerId}:page:${page}:limit:${limit}`,

    /** Replies for a specific thread, viewer-isolated */
    repliesByThread: (
        threadId: string | number,
        viewerId: string | number = "guest"
    ) => `replies:thread:${threadId}:viewer:${viewerId}`,

    /** Authenticated user's own profile */
    myProfile: (userId: string | number) => `profile:me:${userId}`,

    /** User profile fetched by username */
    userByUsername: (username: string) => `profile:username:${username}`,

    /** Suggested users for a given user */
    suggestedUsers: (userId: string | number) => `follows:suggested:${userId}`,
};
