import { Skeleton } from './Skeleton';

function LoadingCard() {
  return (
    <div className="p-6 border rounded-lg space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

function LoadingButton() {
  return <Skeleton className="h-10 w-32 rounded-md" />;
}

function LoadingInput() {
  return <Skeleton className="h-10 w-full rounded-md" />;
}

function LoadingExercise() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-5 w-1/3" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  );
}

function LoadingProgramCard() {
  return (
    <div className="p-6 border rounded-lg space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full rounded" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  );
}

function LoadingStats() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}

function LoadingForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <LoadingInput />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <LoadingInput />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <LoadingInput />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <LoadingInput />
      </div>
      <LoadingButton />
    </div>
  );
}

export {
  Skeleton,
  LoadingCard,
  LoadingButton,
  LoadingInput,
  LoadingExercise,
  LoadingProgramCard,
  LoadingStats,
  LoadingForm,
};
