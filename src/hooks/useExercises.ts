import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/routes/__root';
import { createExercise, getExercises, updateExercise as updateExerciseDb, deleteExercise as deleteExerciseDb } from '@/lib/db/local-repository';

export function useExercises() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['exercises', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getExercises(user.id);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; muscleGroup: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');
      return createExercise(user.id, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ localId, data }: { localId: string; data: Partial<{ name: string; muscleGroup: string; description: string }> }) => {
      return updateExerciseDb(localId, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (localId: string) => {
      return deleteExerciseDb(localId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  return {
    exercises: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createExercise: createMutation.mutateAsync,
    updateExercise: updateMutation.mutateAsync,
    deleteExercise: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
