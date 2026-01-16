import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
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

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Terms of Use</h1>
                <div className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-purple-400 hover:prose-a:text-purple-300">

                    <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl mb-12">
                        <h3 className="text-xl font-bold text-white mt-0 mb-4">Affiliate Disclosure</h3>
                        <p className="mb-0 text-zinc-300">
                            Animation Reference participates in various affiliate marketing programs, which means we may get paid commissions on editorially chosen products purchased through our links to retailer sites. This comes at no extra cost to you and helps support the platform.
                        </p>
                    </div>

                    <p className="text-sm text-zinc-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                    <p>PLEASE READ THIS TERMS OF USE AGREEMENT (THE “TERMS OF USE”) CAREFULLY. THIS WEBSITE AND THE INFORMATION ON IT ARE CONTROLLED BY ANIMATION REFERENCE (THE “COMPANY”). THESE TERMS OF USE GOVERN THE USE OF THE WEBSITE AND APPLY TO ALL INTERNET USERS VISITING THE WEBSITE BY ACCESS OR USING THE WEBSITE IN ANY WAY, INCLUDING USING THE SERVICES AND RESOURCES AVAILABLE OR ENABLED VIA THE WEBSITE.</p>

                    <p>COMPLETING THE REGISTRATION PROCESS, AND/OR BROWSING THE WEBSITE, YOU REPRESENT THAT (1) YOU HAVE READ, UNDERSTAND, AND AGREE TO BE BOUND BY THE TERMS OF USE, (2) YOU ARE OF LEGAL AGE TO FORM A BINDING CONTRACT WITH THE COMPANY, AND (3) YOU HAVE THE AUTHORITY TO ENTER INTO THE TERMS OF USE PERSONALLY OR ON BEHALF OF THE COMPANY THAT YOU HAVE NAMED AS THE USER, AND TO BIND THAT COMPANY TO THE TERMS OF USE. THE TERM “YOU” or “USER(S)” REFERS TO THE INDIVIDUAL OR LEGAL ENTITY, AS APPLICABLE, IDENTIFIED AS THE USER WHEN YOU’RE REGISTERED ON THE WEBSITE. IF YOU DO NOT AGREE TO BE BOUND BY THE TERMS OF USE, YOU MAY NOT ACCESS OR USE THIS WEBSITE OR THE SERVICES.</p>

                    <p>PLEASE BE AWARE THAT SECTION 14 OF THIS AGREEMENT, BELOW, CONTAINS PROVISIONS GOVERNING HOW CLAIMS THAT YOU AND WE HAVE AGAINST EACH OTHER ARE RESOLVED, INCLUDING, WITHOUT LIMITATION, ANY CLAIMS THAT AROSE OR WERE ASSERTED PRIOR TO THE EFFECTIVE DATE OF THIS AGREEMENT. IN PARTICULAR, IT CONTAINS AN ARBITRATION AGREEMENT WHICH WILL, WITH LIMITED EXCEPTIONS, REQUIRE DISPUTES BETWEEN US TO BE SUBMITTED TO BINDING AND FINAL ARBITRATION.</p>

                    <h3>1. Use of the Services and Properties</h3>
                    <p>The Software, the Website, and the Services (collectively, the “Properties”) are protected by copyright laws throughout the world. Subject to the Terms, Animation Reference grants you a limited license to reproduce portions of Properties for the sole purpose of using the Services for your personal or internal business purposes.</p>

                    <h3>1.1 Updates</h3>
                    <p>You understand that Properties are evolving. As a result, we may require you to accept updates to Properties that you have installed on your computer or mobile device.</p>

                    <h3>1.2 Certain Restrictions</h3>
                    <p>The Properties may only be used for the personal, educational and professional purposes described above. In no event are you permitted to use any Properties for entertainment purposes or to utilize or distribute any Properties in any manner other than as expressly permitted hereunder. Without limiting the foregoing, you agree to use the Services solely for lawful purposes.</p>

                    <h3>2. Registration</h3>
                    <p><strong>2.1 Registering Your Account:</strong> In order to access certain features of Properties you may be required to become a Registered User.</p>
                    <p><strong>2.2 Registration Data:</strong> In registering an account on the Website, you agree to (1) provide true, accurate, current and complete information about yourself as prompted by the registration form; and (2) maintain and promptly update the Registration Data to keep it true, accurate, current and complete.</p>

                    <h3>3. Ownership</h3>
                    <p><strong>3.1 Properties:</strong> You agree that Animation Reference and its suppliers own all rights, title and interest in Properties (including but not limited to, any titles, computer code, themes, objects, characters, concepts, artwork, animations, sounds, musical compositions, audiovisual effects, methods of operation, moral rights, documentation, transcripts, and server software).</p>

                    <h3>4. User Conduct</h3>
                    <p>You agree that you will not, under any circumstances:</p>
                    <ul>
                        <li>Attempt to gain unauthorized access to Properties, accounts registered to others, or to the computers, servers or networks connected to Properties.</li>
                        <li>Reproduce, duplicate, copy, sell, trade, resell or exploit for any commercial purpose any portion of Properties.</li>
                        <li>Upload, post, e-mail, transmit or otherwise make available any unsolicited or unauthorized advertising, promotional materials, “junk mail,” “spam,” “chain letters,” “pyramid schemes,” or any other form of solicitation.</li>
                    </ul>

                    <h3>5. Fees and Purchase Terms</h3>
                    <p><strong>5.1 Payment:</strong> You agree to pay all fees or charges to your Account in accordance with the fees, charges and billing terms in effect at the time a fee or charge is due and payable. You must provide a valid credit card (Visa, MasterCard, or any other issuer accepted by us) to Stripe, our third party payment provider.</p>

                    <h3>6. Disclaimer of Warranties</h3>
                    <p>YOU EXPRESSLY UNDERSTAND AND AGREE THAT TO THE EXTENT PERMITTED BY APPLICABLE LAW, YOUR USE OF PROPERTIES IS AT YOUR SOLE RISK, AND PROPERTIES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS, WITH ALL FAULTS.</p>

                    <h3>7. Limitation of Liability</h3>
                    <p>YOU UNDERSTAND AND AGREE THAT IN NO EVENT SHALL ANIMATION REFERENCE BE LIABLE FOR ANY LOSS OF PROFITS, REVENUE OR DATA, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH PROPERTIES.</p>

                    <h3>8. Dispute Resolution</h3>
                    <p>Please read the following arbitration agreement in this Section (“Arbitration Agreement”) carefully. It requires you to arbitrate disputes with Animation Reference and limits the manner in which you can seek relief from us.</p>
                    <p><strong>8.1 Applicability of Arbitration Agreement:</strong> You agree that any dispute or claim relating in any way to your access or use of the Website, or to any aspect of your relationship with Animation Reference, will be resolved by binding arbitration, rather than in court.</p>

                    <h3>9. General Provisions</h3>
                    <p><strong>9.1 Electronic Communications:</strong> The communications between you and Animation Reference use electronic means, whether you visit Properties or send e-mails, or whether we post notices on Properties or communicate with you via e-mail.</p>
                    <p><strong>9.2 Questions, Complaints, Claims:</strong> If you have any questions, complaints or claims with respect to Properties, please contact us at: <a href="mailto:support@animationreference.org">support@animationreference.org</a>.</p>

                </div>
            </div>
        </div>
    );
}
