const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hyttehits API',
      version: '1.0.0',
      description: 'API for Hitster song management game',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'UUID',
          description: 'Enter your authentication token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            role: {
              type: 'string',
              description: 'User role',
              enum: ['admin']
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Username'
            },
            password: {
              type: 'string',
              description: 'Password'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Authentication token (UUID)'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Song: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Song ID'
            },
            video_id: {
              type: 'string',
              description: 'YouTube video ID'
            },
            title: {
              type: 'string',
              description: 'Song title'
            },
            artist: {
              type: 'string',
              description: 'Artist name'
            },
            year: {
              type: 'integer',
              description: 'Release year'
            },
            status: {
              type: 'string',
              enum: ['working', 'broken'],
              description: 'Video availability status'
            },
            last_checked: {
              type: 'string',
              format: 'date-time',
              description: 'Last time video was checked',
              nullable: true
            },
            playlists: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Playlist'
              },
              description: 'Playlists this song belongs to'
            }
          }
        },
        SongCreate: {
          type: 'object',
          required: ['title', 'artist', 'year', 'video_id', 'playlists'],
          properties: {
            title: {
              type: 'string',
              description: 'Song title'
            },
            artist: {
              type: 'string',
              description: 'Artist name'
            },
            year: {
              type: 'integer',
              description: 'Release year'
            },
            video_id: {
              type: 'string',
              description: 'YouTube video ID'
            },
            status: {
              type: 'string',
              enum: ['working', 'broken'],
              default: 'working',
              description: 'Video availability status'
            },
            playlists: {
              type: 'array',
              items: {
                type: 'integer'
              },
              minItems: 1,
              description: 'Array of playlist IDs'
            }
          }
        },
        Playlist: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Playlist ID'
            },
            name: {
              type: 'string',
              description: 'Playlist name'
            },
            description: {
              type: 'string',
              description: 'Playlist description',
              nullable: true
            },
            song_count: {
              type: 'integer',
              description: 'Number of songs in playlist'
            }
          }
        },
        PlaylistCreate: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Playlist name'
            },
            description: {
              type: 'string',
              description: 'Playlist description'
            }
          }
        },
        YearRangeInfo: {
          type: 'object',
          properties: {
            min_year: {
              type: 'integer',
              description: 'Earliest year in database'
            },
            max_year: {
              type: 'integer',
              description: 'Latest year in database'
            },
            total_songs: {
              type: 'integer',
              description: 'Total number of working songs'
            }
          }
        },
        Stats: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of songs'
            },
            working: {
              type: 'integer',
              description: 'Number of working songs'
            },
            broken: {
              type: 'integer',
              description: 'Number of broken songs'
            },
            unchecked: {
              type: 'integer',
              description: 'Number of unchecked songs'
            },
            byPlaylist: {
              type: 'object',
              additionalProperties: {
                type: 'integer'
              },
              description: 'Song counts by playlist'
            }
          }
        },
        GameLog: {
          type: 'object',
          required: ['video_id'],
          properties: {
            video_id: {
              type: 'string',
              description: 'YouTube video ID'
            },
            team_name: {
              type: 'string',
              description: 'Team name'
            },
            playlist: {
              type: 'string',
              description: 'Playlist name'
            },
            guessed_correctly: {
              type: 'boolean',
              description: 'Whether the guess was correct'
            },
            session_id: {
              type: 'string',
              description: 'Game session ID'
            }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Audit log ID'
            },
            user_id: {
              type: 'integer',
              description: 'User ID who performed the action'
            },
            username: {
              type: 'string',
              description: 'Username who performed the action'
            },
            action: {
              type: 'string',
              description: 'Action performed'
            },
            resource_type: {
              type: 'string',
              description: 'Type of resource affected'
            },
            resource_id: {
              type: 'string',
              description: 'ID of affected resource'
            },
            details: {
              type: 'object',
              description: 'Additional details about the action'
            },
            ip_address: {
              type: 'string',
              description: 'IP address of user'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of action'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication endpoints'
      },
      {
        name: 'Public Songs',
        description: 'Public endpoints for song access (game interface)'
      },
      {
        name: 'Public Playlists',
        description: 'Public endpoints for playlist information'
      },
      {
        name: 'Admin Songs',
        description: 'Protected endpoints for song management'
      },
      {
        name: 'Admin Playlists',
        description: 'Protected endpoints for playlist management'
      },
      {
        name: 'Admin Users',
        description: 'Protected endpoints for user management'
      },
      {
        name: 'Admin Audit',
        description: 'Protected endpoints for audit logs'
      },
      {
        name: 'Game Logs',
        description: 'Endpoints for game analytics'
      },
      {
        name: 'Health',
        description: 'Health check endpoint'
      }
    ]
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
