import { createFileRoute } from '@tanstack/react-router';
import { TemplateEditor } from '@/components/TemplateEditor';

function NewTemplate() {
  return <TemplateEditor mode="create" />;
}

export const Route = createFileRoute('/templates/new')({
  component: NewTemplate,
});
