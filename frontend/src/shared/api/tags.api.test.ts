import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/shared/api/client', () => ({
  api: apiMock,
}));

import { createTag } from '@/shared/api/tags';

describe('shared/api/tags', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    localStorage.clear();
  });

  it('createTag resolves created tag when backend returns 409 duplicate conflict', async () => {
    apiMock.get
      .mockResolvedValueOnce({ data: { tags: [] } })
      .mockResolvedValueOnce({ data: { tags: [{ id: 5, name: 'Release' }] } });
    apiMock.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    });

    const result = await createTag({ name: 'Release', color: '#3380F6' });

    expect(apiMock.post).toHaveBeenCalledWith('/projects/tags/', { name: 'Release' });
    expect(result).toEqual({
      id: 5,
      name: 'Release',
      color: '#3380F6',
    });
  });
});
