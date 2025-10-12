import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setTenantContext } from '@/lib/prisma-rls';
import { getDashboardKpiData } from '@/services/dashboard';


/**
 * API route to securely fetch KPI data for the active workspace.
 * This handler is critical as it enforces Row Level Security (RLS) 
 * using the utility functions.
 * * @param req The incoming request object, expected to contain the X-Workspace-ID header.
 * @returns JSON response containing the KPI data or an error.
 */
export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate user and get session
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Establish RLS Context
        // Set the tenant context for RLS to filter data by user
        await setTenantContext(session.user.id);

        // 3. Fetch RLS-Protected Data
        // The service layer function will now run under the RLS context, 
        // automatically filtering the data to only include the active workspace's KPIs.
        const data = await getDashboardKpiData(session.user.plan);

        // 4. Return Success
        return NextResponse.json(data, { status: 200 });

    } catch (e) {
        const error = e as Error & { cause?: number };

        console.error('API Error in /api/dashboard/kpis:', error.message);

        // Determine the HTTP status code based on the error cause
        const statusCode = error.cause || (error.message.includes('Unauthorized') ? 401 : 403);
        const errorMessage = error.message.includes('Forbidden') || error.message.includes('403')
            ? 'Not authorized to access workspace data.'
            : error.message;

        // 5. Return Security/Operational Error
        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode }
        );
    }
}
