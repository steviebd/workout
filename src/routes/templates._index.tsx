/* eslint-disable @typescript-eslint/consistent-type-definitions, react/jsx-closing-tag-location */
import { createFileRoute } from '@tanstack/react-router';
import { Calendar, Copy, Edit, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';

type Template = {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
}

function Templates() {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [by, order] = e.target.value.split('-');
    setSortBy(by as 'createdAt' | 'name');
    setSortOrder(order as 'ASC' | 'DESC');
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/templates?${params.toString()}`, {
        credentials: 'include',
      });

       if (response.ok) {
         const data = await response.json();
         setTemplates(data as Template[]);
       }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchTemplates();
    }
  }, [auth.loading, auth.user, fetchTemplates]);

  

     const handleDelete = useCallback(async (templateId: string) => {
       try {
         const response = await fetch(`/api/templates/${templateId}`, {
           method: 'DELETE',
           credentials: 'include',
         });

         if (response.ok) {
           void fetchTemplates();
         } else {
           setError('Failed to delete template');
         }
       } catch {
         setError('Failed to delete template');
       }
     }, [fetchTemplates]);

   const handleDeleteClick = useCallback((e: React.MouseEvent) => {
     const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
     if (id) {
       void handleDelete(id);
     }
   }, [handleDelete]);







  if (auth.loading || redirecting) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Redirecting to sign in...'}</p>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50 p-4 sm:p-8'}>
		{error ? <div className="text-red-500 mb-4">{error}</div> : null}
		<div className={'max-w-6xl mx-auto'}>
			<div className={'flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'}>
				<h1 className={'text-3xl font-bold text-gray-900'}>{'Templates'}</h1>
				<a
					className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'}
					href={'/templates/new'}
				>
					<Plus size={20} />
					{'New Template'}
				</a>
			</div>

			<div className={'flex flex-col sm:flex-row gap-4 mb-6'}>
				<div className={'relative flex-1'}>
					<Search className={'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'} size={20} />
					<input
						className={'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'}
						onChange={handleSearchChange}
						placeholder={'Search templates...'}
						type={'text'}
						value={search}
					/>
				</div>
				<select
					className={'px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white'}
					onChange={handleSortChange}
					value={`${sortBy}-${sortOrder}`}
				>
					<option value={'createdAt-DESC'}>{'Newest First'}</option>
					<option value={'createdAt-ASC'}>{'Oldest First'}</option>
					<option value={'name-ASC'}>{'Name (A-Z)'}</option>
					<option value={'name-DESC'}>{'Name (Z-A)'}</option>
				</select>
			</div>

			{loading ? (
				<div className={'flex items-center justify-center py-12'}>
					<div className={'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'} />
				</div>
        ) : templates.length === 0 ? (
	<div className={'text-center py-12'}>
		<FileText className={'mx-auto h-12 w-12 text-gray-400 mb-4'} />
		<h3 className={'text-lg font-medium text-gray-900 mb-2'}>{'No templates found'}</h3>
		<p className={'text-gray-600 mb-4'}>
			{search
                ? 'Try adjusting your search'
                : 'Create your first workout template to get started'}
		</p>
		{!search ? <a
			className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'}
			href={'/templates/new'}
		>
			<Plus size={20} />
			{'New Template'}
		</a> : null}
	</div>
        ) : (
	<div className={'grid grid-cols-1 gap-4'}>
		{templates.map((template) => (
			<div
				className={'bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all'}
				key={template.id}
			>
				<div className={'flex items-start justify-between mb-2'}>
					<a
						className={'font-semibold text-gray-900 hover:text-blue-600'}
						href={`/templates/${template.id}`}
					>
						{template.name}
					</a>
					<div className={'flex items-center gap-2'}>
						<span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800'}>
							{template.exerciseCount}
							{' '}
							{'exercises'}
						</span>
					</div>
				</div>
				{template.description ? <p className={'text-sm text-gray-600 line-clamp-2 mb-3'}>{template.description}</p> : null}
				<div className={'flex items-center justify-between'}>
					<div className={'flex items-center text-xs text-gray-500'}>
						<Calendar className={'mr-1'} size={14} />
						{new Date(template.createdAt).toLocaleDateString()}
					</div>
					<div className={'flex items-center gap-2'}>
						<button
							className={'p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'}
							data-id={template.id}
							onClick={handleDeleteClick}
							title={'Delete template'}
						>
							<Copy size={18} />
						</button>
						<a
							className={'p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'}
							href={`/templates/${template.id}/edit`}
							title={'Edit template'}
						>
							<Edit size={18} />
						</a>
						<button
							className={'p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'}
							data-id={template.id}
							onClick={handleDeleteClick}
							title={'Delete template'}
						>
							<Trash2 size={18} />
						</button>
					</div>
				</div>
			</div>
            ))}
	</div>
        )}
		</div>
	</div>
  );
}

export const Route = createFileRoute('/templates/_index')({
  component: Templates,
});
