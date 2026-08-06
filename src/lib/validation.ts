import { z } from 'zod';

// Zod Schema for "Crear Tarea" (Create Task)
export const createTaskSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),
  usuario_id: z
    .string()
    .min(1, 'Debes asignar la tarea a un miembro de la familia'),
  hora_programada: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
      { message: 'La hora debe tener formato válido (HH:MM)' }
    ),
  tiempo_estimado_min: z
    .number()
    .min(1, 'El tiempo mínimo es 1 minuto')
    .max(1440, 'El tiempo máximo es 1440 minutos (24 horas)'),
  categoria: z.enum(['Hogar', 'Estudio', 'Salud', 'Personal', 'Otros']),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;

// Zod Schema for "Unirse a Familia" (Join Family)
export const joinFamilySchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4, 'El código debe tener al menos 4 caracteres')
    .max(25, 'El código no puede exceder 25 caracteres')
    .regex(/^[A-Za-z0-9_-]+$/, 'El código solo puede contener letras, números y guiones'),
});

export type JoinFamilyFormData = z.infer<typeof joinFamilySchema>;

// Helper function to format Zod errors into a field -> error mapping object
export function getZodErrors(result: { success: boolean; error?: z.ZodError }): Record<string, string> {
  if (result.success || !result.error) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[String(key)]) {
      errors[String(key)] = issue.message;
    }
  }
  return errors;
}
