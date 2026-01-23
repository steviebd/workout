import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TemplateExerciseData } from '@/lib/db/local-db';
import { useAuth } from '@/routes/__root';
import { createTemplate, getTemplates, updateTemplate as updateTemplateDb, deleteTemplate as deleteTemplateDb } from '@/lib/db/local-repository';

export function useTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getTemplates(user.id);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; exercises: TemplateExerciseData[] }) => {
      if (!user) throw new Error('Not authenticated');
      return createTemplate(user.id, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ localId, data }: { localId: string; data: Partial<{ name: string; description: string; exercises: TemplateExerciseData[] }> }) => {
      return updateTemplateDb(localId, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (localId: string) => {
      return deleteTemplateDb(localId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
