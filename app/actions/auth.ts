'use server'

import { createClient } from '@/lib/supabase/server'

export async function autoConfirmEmail(email: string) {
  const supabase = await createClient()

  try {
    // Auto-confirm the user's email by updating the user
    const { error } = await supabase.auth.admin.updateUserById(
      (await supabase.auth.getUser()).data.user?.id || '',
      {
        email_confirm: true,
      },
    )

    if (error) {
      console.error('[v0] Error confirming email:', error)
      return { error: 'Failed to confirm email' }
    }

    return { success: true }
  } catch (err) {
    console.error('[v0] Auto-confirm error:', err)
    return { error: 'An error occurred during auto-confirmation' }
  }
}
