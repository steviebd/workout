import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/routes/__root';
import { createWorkout, getWorkouts, updateWorkout as updateWorkoutDb, completeWorkout as completeWorkoutDb } from '@/lib/db/local-repository';

export function useWorkouts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getWorkouts(user.id);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; templateId?: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      return createWorkout(user.id, { ...data, status: 'in_progress' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ localId, data }: { localId: string; data: Partial<{ name: string; notes: string; completedAt: Date }> }) => {
      return updateWorkoutDb(localId, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (localId: string) => {
      return completeWorkoutDb(localId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  return {
    workouts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createWorkout: createMutation.mutateAsync,
    updateWorkout: updateMutation.mutateAsync,
    completeWorkout: completeMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}
