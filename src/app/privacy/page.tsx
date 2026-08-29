import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hardcoded rather than new Date() so the page doesn't silently claim to have
// been updated every time it renders — and so it stays stable between server
// and client. Bump it by hand whenever this policy actually changes.
const LAST_UPDATED = 'August 27, 2026';
const CONTACT_EMAIL = 'michaelfred124@gmail.com';

export const metadata: Metadata = {
    title: 'Privacy Policy | Animation Reference',
    description:
        'How Animation Reference collects, uses, and protects your information across the website and the Clip & Save browser extension.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#020005] text-zinc-300 font-sans selection:bg-purple-500/30">
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="mb-8">
                    <Button asChild variant="ghost" className="pl-0 hover:bg-transparent text-zinc-400 hover:text-white">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Privacy Policy</h1>

                <div className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-purple-400 hover:prose-a:text-purple-300">

                    <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl mb-12">
                        <h3 className="text-xl font-bold text-white mt-0 mb-4">The short version</h3>
                        <p className="mb-0 text-zinc-300">
                            We collect what we need to run your account and save your work — nothing more.
                            We do not sell your personal information, we do not serve advertising, and we do
                            not use your data to build profiles for anyone else. The Clip &amp; Save browser
                            extension keeps your sign-in on your own device and only sends us a page address
                            when you actively capture a clip.
                        </p>
                    </div>

                    <p className="text-sm text-zinc-500 mb-8">Last Updated: {LAST_UPDATED}</p>

                    <p>
                        This Privacy Policy explains how Animation Reference (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles
                        information when you use <Link href="/">animationreference.org</Link> (the
                        &ldquo;Website&rdquo;) and the <strong>Animation Reference — Clip &amp; Save</strong> browser
                        extension (the &ldquo;Extension&rdquo;). Together these are the &ldquo;Services&rdquo;.
                    </p>
                    <p>
                        Using the Services means you agree to this policy. It works alongside our{' '}
                        <Link href="/terms">Terms of Use</Link>.
                    </p>

                    <h3>1. Information we collect</h3>

                    <p><strong>1.1 Account information.</strong> When you register we collect your email address
                        and a display name. If you sign in with Google, Google provides us your email address,
                        name, and profile picture — we never see your Google password. If you register with an
                        email and password, authentication is handled by Firebase Authentication and we never
                        store your password ourselves.</p>

                    <p><strong>1.2 Profile information.</strong> Anything you choose to add to your public
                        profile — biography, links, avatar, role, location, portfolio items and breakdowns.
                        This is optional, and whatever you put here is visible to other users.</p>

                    <p><strong>1.3 Content you create.</strong> Boards, saved references, moodboards, drawings,
                        clips, comments, feedback, production and crew listings, and any files you upload.</p>

                    <p><strong>1.4 Payment information.</strong> Subscriptions are processed by Stripe.
                        <strong> We never receive or store your card number.</strong> Stripe gives us a customer
                        identifier, your subscription status and plan tier, which is all we keep.</p>

                    <p><strong>1.5 Technical information.</strong> Like most websites, our hosting and content
                        delivery providers automatically log IP addresses, browser and device type, and pages
                        requested. This is used for security, abuse prevention and diagnosing faults.</p>

                    <p><strong>1.6 Communications.</strong> If you email us or submit feedback, we keep that
                        correspondence so we can respond and follow up.</p>

                    <h3>2. The Clip &amp; Save browser extension</h3>

                    <p>The Extension is covered by this same policy. Because browser extensions can be
                        intrusive, here is precisely what ours does and does not do.</p>

                    <p><strong>2.1 What it accesses.</strong> The Extension places a small capture button on web
                        pages so you can save a video you are watching. To do that it needs permission to run on
                        the sites you visit. It reads a page&rsquo;s address and video details{' '}
                        <strong>only when you actively click to capture</strong> — it does not read, log, or
                        transmit the pages you browse otherwise.</p>

                    <p><strong>2.2 What it stores on your device.</strong> Your Animation Reference sign-in token,
                        its refresh token and expiry, and the address of the site it is paired with. These live in
                        your browser&rsquo;s local extension storage on your own computer. They are used to prove
                        you are signed in when saving a clip. Signing out or disconnecting removes them.</p>

                    <p><strong>2.3 What it sends us.</strong> When you capture a clip, the Extension sends the
                        page address and the video&rsquo;s public metadata (such as title, duration and thumbnail)
                        to animationreference.org so the clip can be saved to your account.</p>

                    <p><strong>2.4 What it never does.</strong> The Extension does not sell or transfer your data
                        to third parties; does not use your data for advertising, credit scoring or lending
                        decisions; does not track your browsing history; does not record your screen, microphone
                        or camera; and contains no remotely-hosted or dynamically-executed code. Its use of
                        information is limited to providing and improving the capture feature.</p>

                    <p><strong>2.5 Removing it.</strong> Uninstalling the Extension from your browser deletes
                        everything it stored on your device. Clips already saved to your account remain in your
                        account until you delete them.</p>

                    <h3>3. How we use information</h3>
                    <ul>
                        <li>To create and operate your account and authenticate you.</li>
                        <li>To store, display and sync the references, boards and work you save.</li>
                        <li>To process subscriptions and manage billing.</li>
                        <li>To send transactional email — welcome messages, crew application notices, and
                            account or security notifications.</li>
                        <li>To display your public profile and any work you choose to publish.</li>
                        <li>To keep the Services secure, prevent abuse, and fix problems.</li>
                        <li>To respond when you contact us.</li>
                    </ul>

                    <h3>4. Service providers</h3>
                    <p>We use a small number of established providers to run the Services. They process data
                        only on our instructions and for the purposes below:</p>
                    <ul>
                        <li><strong>Google Firebase</strong> — authentication, database, and file storage.</li>
                        <li><strong>Stripe</strong> — subscription payments and billing.</li>
                        <li><strong>Bunny.net</strong> — video hosting and content delivery.</li>
                        <li><strong>Resend</strong> — transactional email delivery.</li>
                        <li><strong>Google AI</strong> — optional AI-assisted features. Content is sent for
                            processing only when you use one of those features.</li>
                    </ul>

                    <h3>5. What we do not do</h3>
                    <p><strong>We do not sell your personal information.</strong> We do not share it with data
                        brokers, we do not run third-party advertising or advertising trackers on the Services,
                        and we do not use your personal information to make decisions about credit or lending.</p>
                    <p>We disclose information outside the providers listed above only when we are legally
                        required to, or where it is genuinely necessary to protect the rights and safety of our
                        users. If Animation Reference were ever acquired or merged, account data could transfer
                        as part of that business — you would be told before it happened.</p>

                    <h3>6. Public information</h3>
                    <p>Some things are public by design: your profile, published breakdowns, portfolio items,
                        production and crew listings, and anything else you deliberately publish. Please treat
                        those as visible to anyone, including search engines. Private boards, vaults and drafts
                        are not public.</p>

                    <h3>7. Retention</h3>
                    <p>We keep your account information and the content you create for as long as your account
                        is open. When you delete your account we remove your personal information and private
                        content, apart from records we must keep for legal or accounting reasons — payment
                        records, for example. Server logs are kept for a limited period and then discarded.</p>

                    <h3>8. Your rights</h3>
                    <p>Wherever you live, you may ask us to:</p>
                    <ul>
                        <li>Give you a copy of the personal information we hold about you.</li>
                        <li>Correct anything that is wrong — most of this you can edit yourself in your profile.</li>
                        <li>Delete your account and the personal information attached to it.</li>
                        <li>Stop sending you non-essential email.</li>
                    </ul>
                    <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on your
                        account and we will respond within 30 days. Depending on where you live — for example
                        the EEA, UK, or California — you may have further rights, including to object to
                        processing or to lodge a complaint with your local data protection authority. We honour
                        these requests regardless of where you are.</p>

                    <h3>9. Security</h3>
                    <p>Traffic is encrypted in transit. Authentication is handled by Firebase, and payment
                        details go directly to Stripe without passing through our servers. No system is perfectly
                        secure, so please use a strong, unique password and tell us promptly if you think your
                        account has been compromised.</p>

                    <h3>10. Children</h3>
                    <p>The Services are not directed at children under 13, and we do not knowingly collect their
                        personal information. If you believe a child has given us information, contact us and we
                        will delete it.</p>

                    <h3>11. International users</h3>
                    <p>We operate from the United States and our providers may process and store data there and
                        in other countries. By using the Services you understand your information may be
                        transferred outside your country of residence.</p>

                    <h3>12. Changes to this policy</h3>
                    <p>We may update this policy as the Services change. The &ldquo;Last Updated&rdquo; date above
                        will always reflect the current version, and we will give notice on the Website for
                        significant changes.</p>

                    <h3>13. Contact</h3>
                    <p>Questions about this policy or about your data:{' '}
                        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

                    <p className="text-sm text-zinc-500 mt-12">
                        See also our <Link href="/terms">Terms of Use</Link> and{' '}
                        <Link href="/dmca">DMCA Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
