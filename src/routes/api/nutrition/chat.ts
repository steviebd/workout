import { createFileRoute } from '@tanstack/react-router';
import { eq, and } from 'drizzle-orm';
import { streamText } from 'ai';
import { model } from '~/lib/ai';
import { apiRoute } from '~/lib/api/api-route';
import { assembleSystemPrompt } from '~/lib/ai/prompts';
import {
  saveChatMessage,
  countImageAnalysesToday,
  getUserBodyStats,
  getTodayIntake,
  getTrainingContext,
  getWhoopData,
  calculateMacroTargets,
  type SystemPromptContext,
} from '~/lib/db/nutrition';
import { getUserPreferences } from '~/lib/db/preferences';
import { userProgramCycles } from '~/lib/db/schema';

export const Route = createFileRoute('/api/nutrition/chat')({
  server: {
    handlers: {
      POST: apiRoute('Nutrition chat', async ({ db, d1Db, session, request }) => {
        const workosId = session.sub;

        let body: {
          messages: Array<{ role: string; content: string }>;
          date: string;
          hasImage: boolean;
          imageBase64?: string;
        };

        try {
          body = await request.json();
        } catch {
          return Response.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { messages, date, hasImage, imageBase64 } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return Response.json({ error: 'Messages are required' }, { status: 400 });
        }

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return Response.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
        }

        if (hasImage) {
          const imageCount = await countImageAnalysesToday(d1Db, workosId, date);
          if (imageCount >= 50) {
            return Response.json(
              { error: 'running out of credits', code: 'RATE_LIMITED' },
              { status: 429 }
            );
          }
        }

        const [prefs, bodyStats, activeProgram] = await Promise.all([
          getUserPreferences(db, workosId),
          getUserBodyStats(db, workosId),
          db
            .select()
            .from(userProgramCycles)
            .where(
              and(
                eq(userProgramCycles.workosId, workosId),
                eq(userProgramCycles.status, 'active')
              )
            )
            .get(),
        ]);

        const energyUnit = (prefs?.energyUnit as 'kcal' | 'kj') ?? 'kcal';
        const weightUnit = (prefs?.weightUnit as 'kg' | 'lbs') ?? 'kg';
        const bodyweightKg = bodyStats?.bodyweightKg ?? null;
        const hasProgram = !!activeProgram;

        const [todayIntake, trainingContext, whoopData] = await Promise.all([
          getTodayIntake(db, workosId, date),
          getTrainingContext(db, workosId, date),
          getWhoopData(db, workosId, date),
        ]);

        const macroTargets = calculateMacroTargets(
          bodyweightKg ?? 80,
          trainingContext?.type ?? null,
          hasProgram,
          {
            targetCalories: bodyStats?.targetCalories ?? undefined,
            targetProteinG: bodyStats?.targetProteinG ?? undefined,
            targetCarbsG: bodyStats?.targetCarbsG ?? undefined,
            targetFatG: bodyStats?.targetFatG ?? undefined,
          }
        );

        const systemContext: SystemPromptContext = {
          bodyweightKg,
          energyUnit,
          weightUnit,
          trainingContext,
          whoopData,
          dailyIntake: todayIntake,
          macroTargets,
        };

        const systemPrompt = assembleSystemPrompt(systemContext);

        const userMessageContent = messages[messages.length - 1].content;
        const hasImageFlag = hasImage && !!imageBase64;

        await saveChatMessage(db, workosId, date, 'user', userMessageContent, hasImageFlag);

        let userContent: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }>;
        if (hasImage && imageBase64) {
          userContent = [
            { type: 'text', text: userMessageContent },
            { type: 'image', image: imageBase64 },
          ];
        } else {
          userContent = userMessageContent;
        }

        const systemMessage = { role: 'system' as const, content: systemPrompt };
        const priorMessages = messages.slice(0, -1).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        const userMessage = { role: 'user' as const, content: userContent };
        const aiMessages = [systemMessage, ...priorMessages, userMessage];

        const result = streamText({
          model,
          messages: aiMessages,
        });

        let fullResponseText = '';
        const textEncoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            for await (const delta of result.fullStream) {
              if (delta.type === 'text-delta') {
                fullResponseText += delta.text;
              }
              const bytes = textEncoder.encode(`${JSON.stringify(delta)}\n`);
              controller.enqueue(bytes);
            }
            controller.close();
          },
        });

        void (async () => {
          try {
            await saveChatMessage(db, workosId, date, 'assistant', fullResponseText, false);
          } catch (err) {
            console.error('Failed to save assistant message:', err);
          }
        })();

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      }),
    },
  },
});
