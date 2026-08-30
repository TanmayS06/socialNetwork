import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Pulse API",
      version: "1.0.0",
      description: "High-performance RESTful API & WebSocket Engine for Pulse Social Platform",
    },

    servers: [{ url: `${process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 9000}`}/api/v1` }],

    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
      },

      schemas: {
        ApiMessage: {
          type: "object",
          properties: { message: { type: "string" } },
        },

        AuthLoginResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Login success" },
            token: { type: "string", example: "jwt.token.here" },
          },
          required: ["message", "token"],
        },

        Thread: {
          type: "object",
          properties: {
            id: { type: "number", example: 10 },
            content: { type: "string", example: "hello" },
            created_at: { type: "string", format: "date-time" },
            image: { type: "array", items: { type: "string" } },
            user: {
              type: "object",
              properties: {
                id: { type: "number", example: 1 },
                username: { type: "string", example: "alex" },
                name: { type: "string", example: "Alex" },
                profile_picture: { type: ["string", "null"], example: "/uploads/a.png" },
              },
              required: ["id", "username", "name"],
            },
            likes: { type: "number", example: 3 },
            reply: { type: "number", example: 1 },
            replies: { type: "number", example: 1 },
            isLiked: { type: "boolean", example: true },
          },
          required: ["id", "content", "created_at", "image", "user", "likes", "isLiked"],
        },

        Reply: {
          type: "object",
          properties: {
            id: { type: "number", example: 99 },
            thread_id: { type: "number", example: 10 },
            content: { type: "string", example: "nice!" },
            created_at: { type: "string", format: "date-time" },
            image: { type: "array", items: { type: "string" } },
            user: {
              type: "object",
              properties: {
                id: { type: "number", example: 1 },
                username: { type: "string", example: "alex" },
                name: { type: "string", example: "Alex" },
                profile_picture: { type: ["string", "null"], example: "/uploads/a.png" },
              },
              required: ["id", "username", "name"],
            },
          },
          required: ["id", "thread_id", "content", "created_at", "user"],
        },

        RepliesByThreadResponse: {
          type: "object",
          properties: {
            replies: { type: "array", items: { $ref: "#/components/schemas/Reply" } },
          },
          required: ["replies"],
        },

        ToggleThreadLikeResponse: {
          type: "object",
          properties: {
            liked: { type: "boolean", example: true },
            likesCount: { type: "number", example: 10 },
            threadId: { type: "number", example: 1 },
          },
          required: ["liked", "likesCount", "threadId"],
        },

        ToggleReplyLikeResponse: {
          type: "object",
          properties: {
            replyId: { type: "number", example: 99 },
            threadId: { type: "number", example: 10 },
            likesCount: { type: "number", example: 6 },
            liked: { type: "boolean", example: true },
          },
          required: ["replyId", "threadId", "likesCount", "liked"],
        },

        SearchUser: {
          type: "object",
          properties: {
            id: { type: "string", example: "1" },
            username: { type: "string", example: "alex" },
            name: { type: "string", example: "Alex" },
            followers: { type: "number", example: 10 },
            avatar: { type: ["string", "null"], example: "/uploads/a.png" },
            is_following: { type: "boolean", example: false },
          },
          required: ["id", "username", "name", "followers", "is_following"],
        },
      },
    },
  },

  apis: ["./src/routes/**/*.ts"],
});
