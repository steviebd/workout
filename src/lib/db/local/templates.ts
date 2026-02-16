import { localDB, type LocalTemplate } from '../local-db';
import { generateLocalId, now, withTransaction } from './utils';
import { queueOperation } from './sync';

/**
 * Creates a new template in local storage for offline use
 * @param workosId - The user's WorkOS ID
 * @param data - Template data excluding system fields
 * @returns The local ID of the created template
 */
export async function createTemplate(workosId: string, data: Omit<LocalTemplate, 'id' | 'localId' | 'workosId' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'needsSync'>): Promise<string> {
  const localId = generateLocalId();
  const template: LocalTemplate = {
    ...data,
    id: undefined,
    localId,
    workosId,
    createdAt: now(),
    updatedAt: now(),
    syncStatus: 'pending',
    needsSync: true,
  };

  await withTransaction(localDB.templates, localDB.offlineQueue, async () => {
    await localDB.templates.add(template);
    await queueOperation('create', 'template', localId, template as unknown as Record<string, unknown>);
  });

  return localId;
}

/**
 * Updates a template in local storage
 * @param localId - The local ID of the template
 * @param data - Fields to update
 * @throws Will throw if template is not found
 */
export async function updateTemplate(localId: string, data: Partial<Omit<LocalTemplate, 'id' | 'localId' | 'workosId' | 'createdAt' | 'syncStatus' | 'needsSync'>>): Promise<void> {
  const template = await localDB.templates.where('localId').equals(localId).first();
  if (!template) throw new Error('Template not found');
  if (template.id === undefined) throw new Error('Template id not found');
  const id = template.id;
  const updated = {
    ...template,
    ...data,
    updatedAt: now(),
    syncStatus: 'pending' as const,
    needsSync: true,
  };

  await withTransaction(localDB.templates, localDB.offlineQueue, async () => {
    await localDB.templates.update(id, updated);
    await queueOperation('update', 'template', localId, updated as unknown as Record<string, unknown>);
  });
}

/**
 * Retrieves all templates for a user from local storage
 * @param workosId - The user's WorkOS ID
 * @returns Array of local templates
 */
export async function getTemplates(workosId: string): Promise<LocalTemplate[]> {
  return localDB.templates.where('workosId').equals(workosId).toArray();
}

/**
 * Retrieves a single template by local ID
 * @param localId - The local ID of the template
 * @returns The template if found, or undefined
 */
export async function getTemplate(localId: string): Promise<LocalTemplate | undefined> {
  return localDB.templates.where('localId').equals(localId).first();
}

/**
 * Deletes a template from local storage (marks for sync)
 * @param localId - The local ID of the template
 * @throws Will throw if template is not found
 */
export async function deleteTemplate(localId: string): Promise<void> {
  const template = await localDB.templates.where('localId').equals(localId).first();
  if (!template) throw new Error('Template not found');
  if (template.id === undefined) throw new Error('Template id not found');
  const id = template.id;

  await withTransaction(localDB.templates, localDB.offlineQueue, async () => {
    await localDB.templates.update(id, {
      syncStatus: 'pending',
      needsSync: true,
    });
    await queueOperation('delete', 'template', localId, { localId });
  });
}
