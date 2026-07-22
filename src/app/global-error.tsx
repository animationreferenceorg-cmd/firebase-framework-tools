'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ background: '#030014', color: '#fff', fontFamily: 'sans-serif' }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    gap: '1rem',
                    textAlign: 'center',
                    padding: '1rem',
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h2>
                    <p style={{ color: '#a1a1aa', maxWidth: '28rem' }}>
                        The app hit an unexpected error. Try again, or reload the page.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '9999px',
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
