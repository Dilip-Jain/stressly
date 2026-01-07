// Define API endpoints to test with their configurations

export const endpoints = [
  // User endpoints
  {
    name: 'List Users',
    path: '/api/users',
    method: 'GET',
    weight: 25, // probability weight (higher = more often)
    expectedStatus: 200,
    timeout: 5000,
    params: {},
    body: null,
    tags: { endpoint: 'users', operation: 'list' },
  },
  {
    name: 'Get User',
    path: '/api/users/1',
    method: 'GET',
    weight: 20,
    expectedStatus: 200,
    timeout: 5000,
    params: {},
    body: null,
    tags: { endpoint: 'users', operation: 'get' },
  },
  {
    name: 'Create User',
    path: '/api/users',
    method: 'POST',
    weight: 10,
    expectedStatus: 201,
    timeout: 8000,
    params: {},
    body: {
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    },
    tags: { endpoint: 'users', operation: 'create' },
  },
  {
    name: 'Update User',
    path: '/api/users/1',
    method: 'PUT',
    weight: 5,
    expectedStatus: 200,
    timeout: 8000,
    params: {},
    body: {
      name: 'Updated User',
      email: 'updated@example.com',
    },
    tags: { endpoint: 'users', operation: 'update' },
  },
  {
    name: 'Delete User',
    path: '/api/users/1',
    method: 'DELETE',
    weight: 2,
    expectedStatus: 204,
    timeout: 5000,
    params: {},
    body: null,
    tags: { endpoint: 'users', operation: 'delete' },
  },

  // Product endpoints
  {
    name: 'List Products',
    path: '/api/products',
    method: 'GET',
    weight: 25,
    expectedStatus: 200,
    timeout: 5000,
    params: { limit: 10, offset: 0 },
    body: null,
    tags: { endpoint: 'products', operation: 'list' },
  },
  {
    name: 'Get Product',
    path: '/api/products/1',
    method: 'GET',
    weight: 15,
    expectedStatus: 200,
    timeout: 5000,
    params: {},
    body: null,
    tags: { endpoint: 'products', operation: 'get' },
  },
  {
    name: 'Search Products',
    path: '/api/products/search',
    method: 'GET',
    weight: 10,
    expectedStatus: 200,
    timeout: 8000,
    params: { q: 'test', category: 'electronics' },
    body: null,
    tags: { endpoint: 'products', operation: 'search' },
  },

  // Order endpoints
  {
    name: 'List Orders',
    path: '/api/orders',
    method: 'GET',
    weight: 15,
    expectedStatus: 200,
    timeout: 5000,
    params: {},
    body: null,
    tags: { endpoint: 'orders', operation: 'list' },
  },
  {
    name: 'Create Order',
    path: '/api/orders',
    method: 'POST',
    weight: 8,
    expectedStatus: 201,
    timeout: 10000,
    params: {},
    body: {
      userId: 1,
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
      shippingAddress: '123 Main St',
    },
    tags: { endpoint: 'orders', operation: 'create' },
  },

  // Analytics endpoints
  {
    name: 'Get Analytics',
    path: '/api/analytics/summary',
    method: 'GET',
    weight: 8,
    expectedStatus: 200,
    timeout: 10000,
    params: { period: 'day' },
    body: null,
    tags: { endpoint: 'analytics', operation: 'summary' },
  },

  // Health check
  {
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
    weight: 2,
    expectedStatus: 200,
    timeout: 3000,
    params: {},
    body: null,
    tags: { endpoint: 'system', operation: 'health' },
  },
];

export default endpoints;
