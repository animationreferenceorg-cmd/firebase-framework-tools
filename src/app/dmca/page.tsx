import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'DMCA / Copyright Policy - Animation Reference',
    description: 'How to submit a copyright takedown notice or counter-notice for content on Animation Reference.',
    robots: { index: true, follow: true },
};

export default function DmcaPage() {
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

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">DMCA / Copyright Policy</h1>
                <div className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-purple-400 hover:prose-a:text-purple-300">

                    <p className="text-sm text-zinc-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                    <p>
                        Animation Reference ("we," "us," or the "Company") respects the intellectual property rights of
                        others and expects its users to do the same. We respond to clear notices of alleged copyright
                        infringement in accordance with the Digital Millennium Copyright Act ("DMCA"), 17 U.S.C. § 512.
                        If you believe content hosted on or accessible through animationreference.org (the "Site")
                        infringes your copyright, you may submit a takedown notice using the process below.
                    </p>

                    <h3>1. Filing a DMCA Takedown Notice</h3>
                    <p>
                        To file a notice of alleged infringement, please send a written communication to our Designated
                        Agent (contact information below) that includes <strong>all</strong> of the following, as
                        required by 17 U.S.C. § 512(c)(3):
                    </p>
                    <ul>
                        <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the exclusive right that is allegedly infringed.</li>
                        <li>Identification of the copyrighted work(s) claimed to have been infringed.</li>
                        <li>Identification of the material claimed to be infringing, and information reasonably sufficient to permit us to locate it — <strong>the specific page URL(s) on animationreference.org</strong> is the most useful identifier.</li>
                        <li>Your contact information, including your name, mailing address, telephone number, and email address.</li>
                        <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                        <li>A statement, made under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf.</li>
                    </ul>
                    <p>
                        Notices that are incomplete or do not identify a specific URL cannot be acted on. Upon receipt of
                        a valid notice, we will remove or disable access to the identified material and notify the user
                        who submitted it.
                    </p>

                    <h3>2. Filing a Counter-Notice</h3>
                    <p>
                        If material you submitted was removed or disabled in response to a takedown notice and you
                        believe it was removed in error or misidentification, you may submit a counter-notice to our
                        Designated Agent that includes:
                    </p>
                    <ul>
                        <li>Your physical or electronic signature.</li>
                        <li>Identification of the material that was removed and the location where it appeared before removal.</li>
                        <li>A statement, under penalty of perjury, that you have a good-faith belief the material was removed as a result of mistake or misidentification.</li>
                        <li>Your name, address, telephone number, and a statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or, if outside the United States, any judicial district in which the Company may be found), and that you will accept service of process from the person who filed the original notice.</li>
                    </ul>
                    <p>
                        Upon receipt of a valid counter-notice, we may reinstate the material within 10–14 business
                        days unless the original complaining party notifies us that they have filed a court action
                        seeking a restraining order against the user.
                    </p>

                    <h3>3. Designated Agent</h3>
                    <p>
                        All DMCA notices and counter-notices should be sent to:
                    </p>
                    <p>
                        Animation Reference — Copyright Agent<br />
                        Email: <a href="mailto:copyright@animationreference.org">copyright@animationreference.org</a>
                    </p>
                    <p className="text-sm text-zinc-500">
                        Please use a subject line starting with "DMCA Notice" or "DMCA Counter-Notice" so it reaches
                        the right team quickly. Notices sent to any other address may result in delayed processing.
                    </p>

                    <h3>4. Repeat Infringer Policy</h3>
                    <p>
                        In accordance with the DMCA and other applicable law, we maintain a policy of terminating, in
                        appropriate circumstances, the accounts of users who are determined to be repeat infringers of
                        the intellectual property rights of others.
                    </p>

                    <h3>5. Community-Submitted Content</h3>
                    <p>
                        A portion of the reference clips on this Site are submitted by community members who represent
                        that they own the content or have the right to share it. We do not independently verify these
                        representations at the time of submission. If you are the original creator of a clip that was
                        submitted without your permission, please use the takedown process above and we will act
                        promptly.
                    </p>

                    <h3>6. Misrepresentations</h3>
                    <p>
                        Please note that under Section 512(f) of the DMCA, any person who knowingly materially
                        misrepresents that material is infringing, or that material was removed by mistake, may be
                        liable for damages. Please be sure of your rights before submitting a notice or counter-notice.
                    </p>

                    <h3>7. Questions</h3>
                    <p>
                        For general (non-legal-notice) questions about this policy, contact{' '}
                        <a href="mailto:support@animationreference.org">support@animationreference.org</a>.
                    </p>

                </div>
            </div>
        </div>
    );
}
