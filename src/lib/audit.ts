import { putAuditLog } from './dynamo'

export async function logAction(
    accountId: string,
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    details?: string
): Promise<void> {
    const logId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)

    await putAuditLog({
        accountId,
        ts: `${Date.now()}#${logId}`,
        userId,
        userEmail,
        action,
        resource,
        details,
    }).catch(err => {
        // audit log failure must never break the main flow
        console.error('Audit log write failed:', err)
    })
}
