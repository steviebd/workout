import { createLazyFileRoute } from '@tanstack/react-router';
import { TemplateEditor } from '@/components/TemplateEditor';

function NewTemplate() {
  return <TemplateEditor mode="create" />;
}

export const Route = createLazyFileRoute('/templates/new')({
  component: NewTemplate,
});
