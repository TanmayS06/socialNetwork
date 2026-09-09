/**
 * Centralized cache key definitions.
 * All Redis keys are prefixed to avoid collision.
 */
export const cacheKeys = {
    /** Feed of all threads, paginated */
    threadsFeed: (page: string) => `threads:feed:page:${page}`,

    /** Single thread detail */
    threadDetail: (id: string | number) => `threads:detail:${id}`,

    /** Threads created by the authenticated user */
    myThreads: (userId: string | number) => `threads:me:${userId}`,

    /** Threads created by a specific user */
    userThreads: (userId: string | number) => `threads:user:${userId}`,

    /** Replies for a specific thread */
    repliesByThread: (threadId: string | number) => `replies:thread:${threadId}`,

    /** Authenticated user's own profile */
    myProfile: (userId: string | number) => `profile:me:${userId}`,

    /** User profile fetched by username */
    userByUsername: (username: string) => `profile:username:${username}`,

    /** Suggested users for a given user */
    suggestedUsers: (userId: string | number) => `follows:suggested:${userId}`,
};
