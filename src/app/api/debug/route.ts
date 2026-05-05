import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const adminApp = getAdminApp();
        const db = getFirestore(adminApp);
        
        const usersSnap = await db.collection('users').get();
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const customersSnap = await db.collection('customers').get();
        const customers = await Promise.all(customersSnap.docs.map(async (doc) => {
            const subsSnap = await db.collection('customers').doc(doc.id).collection('subscriptions').get();
            const subscriptions = subsSnap.docs.map(s => ({ id: s.id, ...s.data() }));
            return { id: doc.id, ...doc.data(), subscriptions };
        }));

        return NextResponse.json({ users, customers });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
