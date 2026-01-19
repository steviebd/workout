/* eslint-disable no-alert */
import { createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, Copy, Dumbbell, Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';
import { Template, TemplateExerciseWithDetails as TemplateExercise } from '@/lib/db/template';

function TemplateDetail() {
  const params = useParams({ from: '/templates/$id' });
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const templateId = params.id;

  useEffect(() => {
    async function fetchTemplate() {
      if (!auth.user) return;

      try {
        const [templateResponse, exercisesResponse] = await Promise.all([
          fetch(`/api/templates/${templateId}`, {
            credentials: 'include',
          }),
          fetch(`/api/templates/${templateId}/exercises`, {
            credentials: 'include',
          }),
        ]);

        if (!templateResponse.ok) {
          if (templateResponse.status === 404) {
            setTemplate(null);
            setExercises([]);
            setError(null);
          } else {
            setError('Failed to load template');
          }
          return;
        }

        const templateData: Template = await templateResponse.json();
        setTemplate(templateData);
        setError(null);

        if (exercisesResponse.ok) {
          const exercisesData: TemplateExercise[] = await exercisesResponse.json();
          setExercises(exercisesData);
        }
      } catch {
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    }

    if (!auth.loading && auth.user) {
      void fetchTemplate();
    } else if (!auth.loading && !auth.user) {
      setLoading(false);
    }
  }, [auth.loading, auth.user, templateId]);

  const handleCopy = async () => {
    setCopying(true);

    try {
      const response = await fetch(`/api/templates/${templateId}/copy`, {
        method: 'POST',
        credentials: 'include',
      });

       if (response.ok) {
          const newTemplate: Template = await response.json();
          window.location.href = `/templates/${newTemplate.id}`;
      } else {
        alert('Failed to copy template');
      }
    } catch {
      alert('Failed to copy template');
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/templates';
      } else {
        alert('Failed to delete template');
      }
    } catch {
      alert('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

   if (auth.loading || !auth.user) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Loading...'}</p>
	</div>
    );
  }

  if (loading) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Loading template...'}</p>
	</div>
    );
  }

  if (error) {
    return (
	<div className={'min-h-screen bg-gray-50 p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'bg-red-50 border border-red-200 rounded-lg p-4'}>
				<p className={'text-red-600'}>{error}</p>
			</div>
		</div>
	</div>
    );
  }

  if (!template) {
    return (
	<div className={'min-h-screen bg-gray-50 p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'bg-white shadow rounded-lg p-6'}>
				<h1 className={'text-2xl font-bold text-gray-900 mb-4'}>{'Template Not Found'}</h1>
				<p className={'text-gray-600 mb-4'}>
					{'The template you\'re looking for doesn\'t exist or has been deleted.'}
				</p>
				<a className={'text-blue-600 hover:text-blue-500'} href={'/templates'}>
					{'← Back to Templates'}
				</a>
			</div>
		</div>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50 p-4 sm:p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'mb-6'}>
				<a
					className={'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'}
					href={'/templates'}
				>
					<ArrowLeft size={20} />
					{'Back to Templates'}
				</a>
			</div>

			<div className={'bg-white shadow rounded-lg overflow-hidden'}>
				<div className={'px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'}>
					<h1 className={'text-2xl font-bold text-gray-900'}>{template.name}</h1>
					<div className={'flex space-x-3'}>
						<button
							className={'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'}
							disabled={copying}
							onClick={() => void handleCopy()}
						>
							<Copy size={18} />
							{copying ? 'Copying...' : 'Copy'}
						</button>
						<a
							className={'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'}
							href={`/templates/${template.id}/edit`}
						>
							<Edit size={18} />
							{'Edit'}
						</a>
						<button
							className={'inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50'}
							disabled={deleting}
							onClick={() => void handleDelete()}
						>
							<Trash2 size={18} />
							{deleting ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>

				<div className={'px-6 py-4 space-y-4'}>
					{template.description ? <div>
						<label className={'block text-sm font-medium text-gray-500'}>{'Description'}</label>
						<p className={'mt-1 text-gray-900 whitespace-pre-wrap'}>{template.description}</p>
                             </div> : null}

					{template.notes ? <div>
						<label className={'block text-sm font-medium text-gray-500'}>{'Notes'}</label>
						<p className={'mt-1 text-gray-900 whitespace-pre-wrap'}>{template.notes}</p>
                       </div> : null}

					<div>
						<label className={'block text-sm font-medium text-gray-500 mb-3'}>
							{'Exercises ('}
							{exercises.length}
							{')'}
						</label>
						{exercises.length === 0 ? (
							<div className={'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center'}>
								<Dumbbell className={'mx-auto h-8 w-8 text-gray-400 mb-2'} />
								<p className={'text-gray-500'}>{'No exercises in this template'}</p>
							</div>
              ) : (
	<div className={'space-y-2'}>
		{exercises.map((te, index) => (
			<div
				className={'flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200'}
				key={te.id}
			>
				<span className={'flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded'}>
					{index + 1}
				</span>
				<Dumbbell className={'text-gray-400'} size={18} />
				<div className={'flex-1'}>
					<p className={'font-medium text-gray-900'}>
						{te.exercise?.name || 'Unknown Exercise'}
					</p>
					{te.exercise?.muscleGroup ? <p className={'text-sm text-gray-500'}>{te.exercise.muscleGroup}</p> : null}
				</div>
			</div>
                  ))}
	</div>
              )}
					</div>

					<div className={'grid grid-cols-2 gap-4 pt-4 border-t border-gray-200'}>
						<div>
							<label className={'block text-sm font-medium text-gray-500'}>{'Created'}</label>
							<p className={'mt-1 text-gray-900 text-sm'}>
								{new Date(template.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
							</p>
						</div>
						<div>
							<label className={'block text-sm font-medium text-gray-500'}>{'Last Updated'}</label>
							<p className={'mt-1 text-gray-900 text-sm'}>
								{new Date(template.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
  );
}

export const Route = createFileRoute('/templates/$id')({
  component: TemplateDetail,
});
