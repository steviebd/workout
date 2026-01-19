import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

describe('Template DB Operations', () => {
  let mockDrizzleDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let createDbMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDrizzleDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    createDbMock = vi.fn(() => mockDrizzleDb);
    vi.doMock('../../src/lib/db/index', () => ({
      createDb: createDbMock,
    }));
  });

  afterEach(() => {
    vi.doUnmock('../../src/lib/db/index');
  });

  describe('createTemplate', () => {
    it('should create a template with required fields', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        name: 'Test Template',
        description: null,
        notes: null,
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockTemplate),
          }),
        }),
      });

      const { createTemplate } = await import('../../src/lib/db/template');

      const result = await createTemplate({} as D1Database, {
        userId: 'user-1',
        name: 'Test Template',
      });

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
      expect(result.id).toBe('template-1');
    });
  });

  describe('getTemplateById', () => {
    it('should return template when found with correct user', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        name: 'Test Template',
        description: null,
        notes: null,
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockTemplate),
          }),
        }),
      });

      const { getTemplateById } = await import('../../src/lib/db/template');

      const result = await getTemplateById({} as D1Database, 'template-1', 'user-1');

      expect(result).toEqual(mockTemplate);
    });

    it('should return null when template not found', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getTemplateById } = await import('../../src/lib/db/template');

      const result = await getTemplateById({} as D1Database, 'template-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when user does not own template', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getTemplateById } = await import('../../src/lib/db/template');

      const result = await getTemplateById({} as D1Database, 'template-1', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      const mockUpdatedTemplate = {
        id: 'template-1',
        userId: 'user-1',
        name: 'Updated Name',
        description: 'Updated description',
        notes: 'Updated notes',
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(mockUpdatedTemplate),
            }),
          }),
        }),
      });

      const { updateTemplate } = await import('../../src/lib/db/template');

      const result = await updateTemplate({} as D1Database, 'template-1', 'user-1', {
        name: 'Updated Name',
        description: 'Updated description',
        notes: 'Updated notes',
      });

      expect(result?.name).toBe('Updated Name');
    });

    it('should return null when template not found', async () => {
      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(null),
            }),
          }),
        }),
      });

      const { updateTemplate } = await import('../../src/lib/db/template');

      const result = await updateTemplate({} as D1Database, 'template-1', 'user-1', {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('softDeleteTemplate', () => {
    it('should soft delete template', async () => {
      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockReturnValue({ success: true }),
          }),
        }),
      });

      const { softDeleteTemplate } = await import('../../src/lib/db/template');

      const result = await softDeleteTemplate({} as D1Database, 'template-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when template not found', async () => {
      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockReturnValue({ success: false }),
          }),
        }),
      });

      const { softDeleteTemplate } = await import('../../src/lib/db/template');

      const result = await softDeleteTemplate({} as D1Database, 'template-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('copyTemplate', () => {
    it('should create a copy of template with exercises', async () => {
      const mockOriginalTemplate = {
        id: 'template-1',
        userId: 'user-1',
        name: 'Original Template',
        description: 'Description',
        notes: 'Notes',
        isDeleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockNewTemplate = {
        id: 'template-2',
        userId: 'user-1',
        name: 'Original Template (Copy)',
        description: 'Description',
        notes: 'Notes',
        isDeleted: false,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const mockExercises = [
        { id: 'te-1', templateId: 'template-1', exerciseId: 'ex-1', orderIndex: 0 },
      ];

      mockDrizzleDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockOriginalTemplate),
          }),
        }),
      });

      mockDrizzleDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockNewTemplate),
          }),
        }),
      });

      mockDrizzleDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockReturnValue(mockExercises),
            }),
          }),
        }),
      });

      mockDrizzleDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          run: vi.fn(),
        }),
      });

      const { copyTemplate } = await import('../../src/lib/db/template');

      const result = await copyTemplate({} as D1Database, 'template-1', 'user-1');

      expect(result?.name).toBe('Original Template (Copy)');
    });

    it('should return null when template not found', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { copyTemplate } = await import('../../src/lib/db/template');

      const result = await copyTemplate({} as D1Database, 'template-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('addExerciseToTemplate', () => {
    it('should add exercise to template', async () => {
      const mockTemplateExercise = {
        id: 'te-1',
        templateId: 'template-1',
        exerciseId: 'ex-1',
        orderIndex: 0,
      };

      mockDrizzleDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockTemplateExercise),
          }),
        }),
      });

      const { addExerciseToTemplate } = await import('../../src/lib/db/template');

      const result = await addExerciseToTemplate(
        {} as D1Database,
        'template-1',
        'ex-1',
        0
      );

      expect(result.templateId).toBe('template-1');
      expect(result.exerciseId).toBe('ex-1');
      expect(result.orderIndex).toBe(0);
    });
  });

  describe('removeExerciseFromTemplate', () => {
    it('should remove exercise from template', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ id: 'template-1' }),
          }),
        }),
      });

      mockDrizzleDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockReturnValue({ success: true }),
        }),
      });

      const { removeExerciseFromTemplate } = await import('../../src/lib/db/template');

      const result = await removeExerciseFromTemplate(
        {} as D1Database,
        'template-1',
        'ex-1',
        'user-1'
      );

      expect(result).toBe(true);
    });

    it('should return false when template not found', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { removeExerciseFromTemplate } = await import('../../src/lib/db/template');

      const result = await removeExerciseFromTemplate(
        {} as D1Database,
        'template-1',
        'ex-1',
        'user-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('reorderTemplateExercises', () => {
    it('should reorder template exercises', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ id: 'template-1' }),
          }),
        }),
      });

      mockDrizzleDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn(),
          }),
        }),
      });

      const { reorderTemplateExercises } = await import('../../src/lib/db/template');

      const result = await reorderTemplateExercises(
        {} as D1Database,
        'template-1',
        [
          { exerciseId: 'ex-1', orderIndex: 1 },
          { exerciseId: 'ex-2', orderIndex: 0 },
        ],
        'user-1'
      );

      expect(result).toBe(true);
    });

    it('should return false when template not found', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { reorderTemplateExercises } = await import('../../src/lib/db/template');

      const result = await reorderTemplateExercises(
        {} as D1Database,
        'template-1',
        [{ exerciseId: 'ex-1', orderIndex: 0 }],
        'user-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('getTemplateExercises', () => {
    it('should return template exercises with details', async () => {
      const mockTemplateExercises = [
        {
          id: 'te-1',
          templateId: 'template-1',
          exerciseId: 'ex-1',
          orderIndex: 0,
          exercise: {
            id: 'ex-1',
            name: 'Bench Press',
            muscleGroup: 'Chest',
          },
        },
        {
          id: 'te-2',
          templateId: 'template-1',
          exerciseId: 'ex-2',
          orderIndex: 1,
          exercise: {
            id: 'ex-2',
            name: 'Squats',
            muscleGroup: 'Legs',
          },
        },
      ];

      mockDrizzleDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ id: 'template-1' }),
          }),
        }),
      });

      mockDrizzleDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue(mockTemplateExercises),
              }),
            }),
          }),
        }),
      });

      const { getTemplateExercises } = await import('../../src/lib/db/template');

      const result = await getTemplateExercises(
        {} as D1Database,
        'template-1',
        'user-1'
      );

      expect(result).toHaveLength(2);
      expect(result[0].exercise?.name).toBe('Bench Press');
    });

    it('should return empty array when template not found', async () => {
      mockDrizzleDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      });

      const { getTemplateExercises } = await import('../../src/lib/db/template');

      const result = await getTemplateExercises(
        {} as D1Database,
        'template-1',
        'user-1'
      );

      expect(result).toEqual([]);
    });
  });
});
