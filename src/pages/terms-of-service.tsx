import type { ReactElement } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'

const TermsOfService: NextPageWithLayout = () => (
  <Container className='py-24'>
    <div>
      <div>
        <div>
          <strong>TERMS OF SERVICE</strong>
        </div>
        <div>
          <strong>Last updated</strong> <strong>February 23, 2025</strong>
        </div>
        <br />
        <br />
        <div>
          <strong>
            <span>AGREEMENT TO OUR LEGAL TERMS</span>
          </strong>
        </div>
        <div>
          We are Dotabod ("<strong>Company</strong>," "<strong>we</strong>," "<strong>us</strong>
          ," "<strong>our</strong>"), a company registered in Texas, United States at 501 Brazos St,
          Austin, TX 78701.
        </div>
        <br />
        <div>
          We operate the website{' '}
          <a href='https://dotabod.com' target='_blank' rel='noreferrer'>
            https://dotabod.com
          </a>{' '}
          (the "<strong>Site</strong>"), as well as any other related products and services that
          refer or link to these legal terms (the "<strong>Legal Terms</strong>") (collectively, the
          "<strong>Services</strong>").
        </div>
        <br />
        <div>
          Dotabod is an open-source toolkit designed to enhance the Dota 2 streaming experience
          through automated game integration and Twitch chat interaction. Built for streamers and
          their audiences, it solves key streaming challenges.
        </div>
        <br />
        <div>
          You can contact us by email at <a href='mailto:tos@dotabod.com'>tos@dotabod.com</a> or by
          mail to 501 Brazos St, Austin, TX 78701, United States.
        </div>
        <br />
        <div>
          These Legal Terms constitute a legally binding agreement made between you, whether
          personally or on behalf of an entity ("<strong>you</strong>
          "), and Dotabod, concerning your access to and use of the Services. You agree that by
          accessing the Services, you have read, understood, and agreed to be bound by all of these
          Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY
          PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
        </div>
        <br />
        <div>
          Supplemental terms and conditions or documents that may be posted on the Services from
          time to time are hereby expressly incorporated herein by reference. We reserve the right,
          in our sole discretion, to make changes or modifications to these Legal Terms from time to
          time. We will alert you about any changes by updating the "Last updated" date of these
          Legal Terms, and you waive any right to receive specific notice of each such change. It is
          your responsibility to periodically review these Legal Terms to stay informed of updates.
          You will be subject to, and will be deemed to have been made aware of and to have
          accepted, the changes in any revised Legal Terms by your continued use of the Services
          after the date such revised Legal Terms are posted.
        </div>
        <br />
        <div>
          The Services are intended for users who are at least 18 years old. Persons under the age
          of 18 are not permitted to use or register for the Services.
        </div>
        <br />
        <div>We recommend that you print a copy of these Legal Terms for your records.</div>
        <br />
        <div>
          <strong>TABLE OF CONTENTS</strong>
        </div>
        <div>
          <a href='#services'>
            <span>1. OUR SERVICES</span>
          </a>
          <br />
          <a href='#ip'>
            <span>2. INTELLECTUAL PROPERTY RIGHTS</span>
          </a>
          <br />
          <a href='#userreps'>
            <span>3. USER REPRESENTATIONS</span>
          </a>
          <br />
          <a href='#userreg'>
            <span>4. USER REGISTRATION</span>
          </a>
          <br />
          <a href='#purchases'>
            <span>5. PURCHASES AND PAYMENT</span>
          </a>
          <br />
          <a href='#subscriptions'>
            <span>6. SUBSCRIPTIONS</span>
          </a>
          <br />
          <a href='#prohibited'>
            <span>7. PROHIBITED ACTIVITIES</span>
          </a>
          <br />
          <a href='#ugc'>
            <span>8. USER GENERATED CONTRIBUTIONS</span>
          </a>
          <br />
          <a href='#license'>
            <span>9. CONTRIBUTION LICENSE</span>
          </a>
          <br />
          <a href='#socialmedia'>
            <span>10. SOCIAL MEDIA</span>
          </a>
          <br />
          <a href='#thirdparty'>
            <span>11. THIRD-PARTY WEBSITES AND CONTENT</span>
          </a>
          <br />
          <a href='#sitemanage'>
            <span>12. SERVICES MANAGEMENT</span>
          </a>
          <br />
          <a href='#ppyes'>
            <span>13. PRIVACY POLICY</span>
          </a>
          <br />
          <a href='#terms'>
            <span>14. TERM AND TERMINATION</span>
          </a>
          <br />
          <a href='#modifications'>
            <span>15. MODIFICATIONS AND INTERRUPTIONS</span>
          </a>
          <br />
          <a href='#law'>
            <span>16. GOVERNING LAW</span>
          </a>
          <br />
          <a href='#disputes'>
            <span>17. DISPUTE RESOLUTION</span>
          </a>
          <br />
          <a href='#corrections'>
            <span>18. CORRECTIONS</span>
          </a>
          <br />
          <a href='#disclaimer'>
            <span>19. DISCLAIMER</span>
          </a>
          <br />
          <a href='#liability'>
            <span>20. LIMITATIONS OF LIABILITY</span>
          </a>
          <br />
          <a href='#indemnification'>
            <span>21. INDEMNIFICATION</span>
          </a>
          <br />
          <a href='#userdata'>
            <span>22. USER DATA</span>
          </a>
          <br />
          <a href='#electronic'>
            <span>23. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</span>
          </a>
          <br />
          <a href='#california'>
            <span>24. CALIFORNIA USERS AND RESIDENTS</span>
          </a>
          <br />
          <a href='#misc'>
            <span>25. MISCELLANEOUS</span>
          </a>
          <br />
          <a href='#contact'>
            <span>26. CONTACT US</span>
          </a>
        </div>
        <br />
        <div id='services'>
          <strong>1. OUR SERVICES</strong>
        </div>
        <div>
          The information provided when using the Services is not intended for distribution to or
          use by any person or entity in any jurisdiction or country where such distribution or use
          would be contrary to law or regulation or which would subject us to any registration
          requirement within such jurisdiction or country. Accordingly, those persons who choose to
          access the Services from other locations do so on their own initiative and are solely
          responsible for compliance with local laws, if and to the extent local laws are
          applicable.
        </div>
        <br />
        <div>
          The Services are not tailored to comply with industry-specific regulations (Health
          Insurance Portability and Accountability Act (HIPAA), Federal Information Security
          Management Act (FISMA), etc.), so if your interactions would be subjected to such laws,
          you may not use the Services. You may not use the Services in a way that would violate the
          Gramm-Leach-Bliley Act (GLBA).
        </div>
        <br />
        <div id='ip'>
          <strong>2. INTELLECTUAL PROPERTY RIGHTS</strong>
        </div>
        <div>
          <strong>Our intellectual property</strong>
        </div>
        <div>
          We are the owner or the licensee of all intellectual property rights in our Services,
          including all source code, databases, functionality, software, website designs, audio,
          video, text, photographs, and graphics in the Services (collectively, the "
          <strong>Content</strong>"), as well as the trademarks, service marks, and logos contained
          therein (the "<strong>Marks</strong>").
        </div>
        <br />
        <div>
          Our Content and Marks are protected by copyright and trademark laws (and various other
          intellectual property rights and unfair competition laws) and treaties in the United
          States and around the world.
        </div>
        <br />
        <div>
          The Content and Marks are provided in or through the Services "<strong>AS IS</strong>" for
          your personal, non-commercial use only.
        </div>
        <div>
          <strong>Your use of our Services</strong>
        </div>
        <div>
          Subject to your compliance with these Legal Terms, including the "
          <a href='#prohibited'>PROHIBITED ACTIVITIES</a>" section below, we grant you a
          non-exclusive, non-transferable, revocable license to:
        </div>
        <ul className='list-disc list-inside'>
          <li>access the Services; and</li>
          <li>
            download or print a copy of any portion of the Content to which you have properly gained
            access,
          </li>
        </ul>
        <div>solely for your personal, non-commercial use.</div>
        <br />
        <div>
          Except as set out in this section or elsewhere in our Legal Terms, no part of the Services
          and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded,
          posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed,
          or otherwise exploited for any commercial purpose whatsoever, without our express prior
          written permission.
        </div>
        <br />
        <div>
          If you wish to make any use of the Services, Content, or Marks other than as set out in
          this section or elsewhere in our Legal Terms, please address your request to:{' '}
          <a href='mailto:tos@dotabod.com'>tos@dotabod.com</a>. If we ever grant you the permission
          to post, reproduce, or publicly display any part of our Services or Content, you must
          identify us as the owners or licensors of the Services, Content, or Marks and ensure that
          any copyright or proprietary notice appears or is visible on posting, reproducing, or
          displaying our Content.
        </div>
        <br />
        <div>
          We reserve all rights not expressly granted to you in and to the Services, Content, and
          Marks.
        </div>
        <br />
        <div>
          Any breach of these Intellectual Property Rights will constitute a material breach of our
          Legal Terms and your right to use our Services will terminate immediately.
        </div>
        <div>
          <strong>Your submissions</strong>
        </div>
        <div>
          Please review this section and the "<a href='#prohibited'>PROHIBITED ACTIVITIES</a>"
          section carefully prior to using our Services to understand the (a) rights you give us and
          (b) obligations you have when you post or upload any content through the Services.
        </div>
        <br />
        <div>
          <strong>Submissions:</strong> By directly sending us any question, comment, suggestion,
          idea, feedback, or other information about the Services ("<strong>Submissions</strong>
          "), you agree to assign to us all intellectual property rights in such Submission. You
          agree that we shall own this Submission and be entitled to its unrestricted use and
          dissemination for any lawful purpose, commercial or otherwise, without acknowledgment or
          compensation to you.
        </div>
        <br />
        <div>
          <strong>You are responsible for what you post or upload:</strong> By sending us
          Submissions through any part of the Services you:
        </div>
        <ul className='list-disc list-inside'>
          <li>
            confirm that you have read and agree with our "
            <a href='#prohibited'>PROHIBITED ACTIVITIES</a>" and will not post, send, publish,
            upload, or transmit through the Services any Submission that is illegal, harassing,
            hateful, harmful, defamatory, obscene, bullying, abusive, discriminatory, threatening to
            any person or group, sexually explicit, false, inaccurate, deceitful, or misleading;
          </li>
          <li>
            to the extent permissible by applicable law, waive any and all moral rights to any such
            Submission;
          </li>
          <li>
            warrant that any such Submission are original to you or that you have the necessary
            rights and licenses to submit such Submissions and that you have full authority to grant
            us the above-mentioned rights in relation to your Submissions; and
          </li>
          <li>
            warrant and represent that your Submissions do not constitute confidential information.
          </li>
        </ul>
        <div>
          You are solely responsible for your Submissions and you expressly agree to reimburse us
          for any and all losses that we may suffer because of your breach of (a) this section, (b)
          any third party's intellectual property rights, or (c) applicable law.
        </div>
        <br />
        <div id='userreps'>
          <strong>3. USER REPRESENTATIONS</strong>
        </div>
        <div>
          By using the Services, you represent and warrant that: (1) all registration information
          you submit will be true, accurate, current, and complete; (2) you will maintain the
          accuracy of such information and promptly update such registration information as
          necessary; (3) you have the legal capacity and you agree to comply with these Legal Terms;
          (4) you are not a minor in the jurisdiction in which you reside; (5) you will not access
          the Services through automated or non-human means, whether through a bot, script or
          otherwise; (6) you will not use the Services for any illegal or unauthorized purpose; and
          (7) your use of the Services will not violate any applicable law or regulation.
        </div>
        <br />
        <div>
          If you provide any information that is untrue, inaccurate, not current, or incomplete, we
          have the right to suspend or terminate your account and refuse any and all current or
          future use of the Services (or any portion thereof).
        </div>
        <br />
        <div id='userreg'>
          <strong>4. USER REGISTRATION</strong>
        </div>
        <div>
          You may be required to register to use the Services. You agree to keep your password
          confidential and will be responsible for all use of your account and password. We reserve
          the right to remove, reclaim, or change a username you select if we determine, in our sole
          discretion, that such username is inappropriate, obscene, or otherwise objectionable.
        </div>
        <br />
        <div id='purchases'>
          <strong>5. PURCHASES AND PAYMENT</strong>
        </div>
        <div>We accept the following forms of payment:</div>
        <ul className='list-disc list-inside'>
          <li>- Visa</li>
          <li>- Mastercard</li>
          <li>- American Express</li>
          <li>- PayPal</li>
          <li>- Discover</li>
        </ul>
        <br />
        <div>
          You agree to provide current, complete, and accurate purchase and account information for
          all purchases made via the Services. You further agree to promptly update account and
          payment information, including email address, payment method, and payment card expiration
          date, so that we can complete your transactions and contact you as needed. Sales tax will
          be added to the price of purchases as deemed required by us. We may change prices at any
          time. All payments shall be in US dollars.
        </div>
        <br />
        <div>
          You agree to pay all charges at the prices then in effect for your purchases and any
          applicable shipping fees, and you authorize us to charge your chosen payment provider for
          any such amounts upon placing your order. We reserve the right to correct any errors or
          mistakes in pricing, even if we have already requested or received payment.
        </div>
        <br />
        <div>
          We reserve the right to refuse any order placed through the Services. We may, in our sole
          discretion, limit or cancel quantities purchased per person, per household, or per order.
          These restrictions may include orders placed by or under the same customer account, the
          same payment method, and/or orders that use the same billing or shipping address. We
          reserve the right to limit or prohibit orders that, in our sole judgment, appear to be
          placed by dealers, resellers, or distributors.
        </div>
        <br />
        <div id='subscriptions'>
          <strong>6. SUBSCRIPTIONS</strong>
        </div>
        <div>
          <strong>Billing and Renewal</strong>
        </div>
        <div>
          Your subscription will continue and automatically renew unless canceled. You consent to
          our charging your payment method on a recurring basis without requiring your prior
          approval for each recurring charge, until such time as you cancel the applicable order.
          The length of your billing cycle will depend on the type of subscription plan you choose
          when you subscribed to the Services.
        </div>
        <br />
        <div>
          <strong>Free Trial</strong>
        </div>
        <div>
          We offer a 14-day free trial to new users who register with the Services. The account will
          be charged according to the user's chosen subscription at the end of the free trial.
        </div>
        <br />
        <div>
          <strong>Cancellation</strong>
        </div>
        <div>
          You can cancel your subscription at any time by logging into your account. Your
          cancellation will take effect at the end of the current paid term. If you have any
          questions or are unsatisfied with our Services, please email us at{' '}
          <a href='mailto:tos@dotabod.com'>tos@dotabod.com</a>.
        </div>
        <br />
        <div>
          <strong>Fee Changes</strong>
        </div>
        <div>
          We may, from time to time, make changes to the subscription fee and will communicate any
          price changes to you in accordance with applicable law.
        </div>
        <br />
        <div id='prohibited'>
          <strong>7. PROHIBITED ACTIVITIES</strong>
        </div>
        <div>
          You may not access or use the Services for any purpose other than that for which we make
          the Services available. The Services may not be used in connection with any commercial
          endeavors except those that are specifically endorsed or approved by us.
        </div>
        <br />
        <div>As a user of the Services, you agree not to:</div>
        <ul className='list-disc list-inside'>
          <li>
            Systematically retrieve data or other content from the Services to create or compile,
            directly or indirectly, a collection, compilation, database, or directory without
            written permission from us.
          </li>
          <li>
            Trick, defraud, or mislead us and other users, especially in any attempt to learn
            sensitive account information such as user passwords.
          </li>
          <li>
            Circumvent, disable, or otherwise interfere with security-related features of the
            Services, including features that prevent or restrict the use or copying of any Content
            or enforce limitations on the use of the Services and/or the Content contained therein.
          </li>
          <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
          <li>
            Use any information obtained from the Services in order to harass, abuse, or harm
            another person.
          </li>
          <li>
            Make improper use of our support services or submit false reports of abuse or
            misconduct.
          </li>
          <li>
            Use the Services in a manner inconsistent with any applicable laws or regulations.
          </li>
          <li>Engage in unauthorized framing of or linking to the Services.</li>
          <li>
            Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or
            other material, including excessive use of capital letters and spamming (continuous
            posting of repetitive text), that interferes with any party's uninterrupted use and
            enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the
            use, features, functions, operation, or maintenance of the Services.
          </li>
          <li>
            Engage in any automated use of the system, such as using scripts to send comments or
            messages, or using any data mining, robots, or similar data gathering and extraction
            tools.
          </li>
          <li>Delete the copyright or other proprietary rights notice from any Content.</li>
          <li>
            Attempt to impersonate another user or person or use the username of another user.
          </li>
          <li>
            Upload or transmit (or attempt to upload or to transmit) any material that acts as a
            passive or active information collection or transmission mechanism, including without
            limitation, clear graphics interchange formats ("gifs"), 1×1 pixels, web bugs, cookies,
            or other similar devices (sometimes referred to as "spyware" or "passive collection
            mechanisms" or "pcms").
          </li>
          <li>
            Interfere with, disrupt, or create an undue burden on the Services or the networks or
            services connected to the Services.
          </li>
          <li>
            Harass, annoy, intimidate, or threaten any of our employees or agents engaged in
            providing any portion of the Services to you.
          </li>
          <li>
            Attempt to bypass any measures of the Services designed to prevent or restrict access to
            the Services, or any portion of the Services.
          </li>
          <li>
            Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML,
            JavaScript, or other code.
          </li>
          <li>
            Except as permitted by applicable law, decipher, decompile, disassemble, or reverse
            engineer any of the software comprising or in any way making up a part of the Services.
          </li>
          <li>
            Except as may be the result of standard search engine or Internet browser usage, use,
            launch, develop, or distribute any automated system, including without limitation, any
            spider, robot, cheat utility, scraper, or offline reader that accesses the Services, or
            use or launch any unauthorized script or other software.
          </li>
          <li>Use a buying agent or purchasing agent to make purchases on the Services.</li>
          <li>
            Make any unauthorized use of the Services, including collecting usernames and/or email
            addresses of users by electronic or other means for the purpose of sending unsolicited
            email, or creating user accounts by automated means or under false pretenses.
          </li>
          <li>
            Use the Services as part of any effort to compete with us or otherwise use the Services
            and/or the Content for any revenue-generating endeavor or commercial enterprise.
          </li>
          <li>Use the Services to advertise or offer to sell goods and services.</li>
          <li>Sell or otherwise transfer your profile.</li>
        </ul>
        <br />
        <div id='ugc'>
          <strong>8. USER GENERATED CONTRIBUTIONS</strong>
        </div>
        <div>
          The Services does not offer users to submit or post content. We may provide you with the
          opportunity to create, submit, post, display, transmit, perform, publish, distribute, or
          broadcast content and materials to us or on the Services, including but not limited to
          text, writings, video, audio, photographs, graphics, comments, suggestions, or personal
          information or other material (collectively, "<strong>Contributions</strong>").
          Contributions may be viewable by other users of the Services and through third-party
          websites. As such, any Contributions you transmit may be treated in accordance with the
          Services' Privacy Policy. When you create or make available any Contributions, you thereby
          represent and warrant that:
        </div>
        <ul className='list-disc list-inside'>
          <li>
            The creation, distribution, transmission, public display, or performance, and the
            accessing, downloading, or copying of your Contributions do not and will not infringe
            the proprietary rights, including but not limited to the copyright, patent, trademark,
            trade secret, or moral rights of any third party.
          </li>
          <li>
            You are the creator and owner of or have the necessary licenses, rights, consents,
            releases, and permissions to use and to authorize us, the Services, and other users of
            the Services to use your Contributions in any manner contemplated by the Services and
            these Legal Terms.
          </li>
          <li>
            You have the written consent, release, and/or permission of each and every identifiable
            individual person in your Contributions to use the name or likeness of each and every
            such identifiable individual person to enable inclusion and use of your Contributions in
            any manner contemplated by the Services and these Legal Terms.
          </li>
          <li>Your Contributions are not false, inaccurate, or misleading.</li>
          <li>
            Your Contributions are not unsolicited or unauthorized advertising, promotional
            materials, pyramid schemes, chain letters, spam, mass mailings, or other forms of
            solicitation.
          </li>
          <li>
            Your Contributions are not obscene, lewd, lascivious, filthy, violent, harassing,
            libelous, slanderous, or otherwise objectionable (as determined by us).
          </li>
          <li>Your Contributions do not ridicule, mock, disparage, intimidate, or abuse anyone.</li>
          <li>
            Your Contributions are not used to harass or threaten (in the legal sense of those
            terms) any other person and to promote violence against a specific person or class of
            people.
          </li>
          <li>Your Contributions do not violate any applicable law, regulation, or rule.</li>
          <li>
            Your Contributions do not violate the privacy or publicity rights of any third party.
          </li>
          <li>
            Your Contributions do not violate any applicable law concerning child pornography, or
            otherwise intended to protect the health or well-being of minors.
          </li>
          <li>
            Your Contributions do not include any offensive comments that are connected to race,
            national origin, gender, sexual preference, or physical handicap.
          </li>
          <li>
            Your Contributions do not otherwise violate, or link to material that violates, any
            provision of these Legal Terms, or any applicable law or regulation.
          </li>
        </ul>
        <div>
          Any use of the Services in violation of the foregoing violates these Legal Terms and may
          result in, among other things, termination or suspension of your rights to use the
          Services.
        </div>
        <br />
        <div id='license'>
          <strong>9. CONTRIBUTION LICENSE</strong>
        </div>
        <div>
          You and Services agree that we may access, store, process, and use any information and
          personal data that you provide following the terms of the Privacy Policy and your choices
          (including settings).
        </div>
        <br />
        <div>
          By submitting suggestions or other feedback regarding the Services, you agree that we can
          use and share such feedback for any purpose without compensation to you.
        </div>
        <br />
        <div>
          We do not assert any ownership over your Contributions. You retain full ownership of all
          of your Contributions and any intellectual property rights or other proprietary rights
          associated with your Contributions. We are not liable for any statements or
          representations in your Contributions provided by you in any area on the Services. You are
          solely responsible for your Contributions to the Services and you expressly agree to
          exonerate us from any and all responsibility and to refrain from any legal action against
          us regarding your Contributions.
        </div>
        <br />
        <div id='socialmedia'>
          <strong>10. SOCIAL MEDIA</strong>
        </div>
        <div>
          As part of the functionality of the Services, you may link your account with online
          accounts you have with third-party service providers (each such account, a "
          <strong>Third-Party Account</strong>") by either: (1) providing your Third-Party Account
          login information through the Services; or (2) allowing us to access your Third-Party
          Account, as is permitted under the applicable terms and conditions that govern your use of
          each Third-Party Account. You represent and warrant that you are entitled to disclose your
          Third-Party Account login information to us and/or grant us access to your Third-Party
          Account, without breach by you of any of the terms and conditions that govern your use of
          the applicable Third-Party Account, and without obligating us to pay any fees or making us
          subject to any usage limitations imposed by the third-party service provider of the
          Third-Party Account. By granting us access to any Third-Party Accounts, you understand
          that (1) we may access, make available, and store (if applicable) any content that you
          have provided to and stored in your Third-Party Account (the "
          <strong>Social Network Content</strong>") so that it is available on and through the
          Services via your account, including without limitation any friend lists and (2) we may
          submit to and receive from your Third-Party Account additional information to the extent
          you are notified when you link your account with the Third-Party Account. Depending on the
          Third-Party Accounts you choose and subject to the privacy settings that you have set in
          such Third-Party Accounts, personally identifiable information that you post to your
          Third-Party Accounts may be available on and through your account on the Services. Please
          note that if a Third-Party Account or associated service becomes unavailable or our access
          to such Third-Party Account is terminated by the third-party service provider, then Social
          Network Content may no longer be available on and through the Services. You will have the
          ability to disable the connection between your account on the Services and your
          Third-Party Accounts at any time. PLEASE NOTE THAT YOUR RELATIONSHIP WITH THE THIRD-PARTY
          SERVICE PROVIDERS ASSOCIATED WITH YOUR THIRD-PARTY ACCOUNTS IS GOVERNED SOLELY BY YOUR
          AGREEMENT(S) WITH SUCH THIRD-PARTY SERVICE PROVIDERS. We make no effort to review any
          Social Network Content for any purpose, including but not limited to, for accuracy,
          legality, or non-infringement, and we are not responsible for any Social Network Content.
          You acknowledge and agree that we may access your email address book associated with a
          Third-Party Account and your contacts list stored on your mobile device or tablet computer
          solely for purposes of identifying and informing you of those contacts who have also
          registered to use the Services. You can deactivate the connection between the Services and
          your Third-Party Account by contacting us using the contact information below or through
          your account settings (if applicable). We will attempt to delete any information stored on
          our servers that was obtained through such Third-Party Account, except the username and
          profile picture that become associated with your account.
        </div>
        <br />
        <div id='thirdparty'>
          <strong>11. THIRD-PARTY WEBSITES AND CONTENT</strong>
        </div>
        <div>
          The Services may contain (or you may be sent via the Site) links to other websites ("
          <strong>Third-Party Websites</strong>") as well as articles, photographs, text, graphics,
          pictures, designs, music, sound, video, information, applications, software, and other
          content or items belonging to or originating from third parties ("
          <strong>Third-Party Content</strong>"). Such Third-Party Websites and Third-Party Content
          are not investigated, monitored, or checked for accuracy, appropriateness, or completeness
          by us, and we are not responsible for any Third-Party Websites accessed through the
          Services or any Third-Party Content posted on, available through, or installed from the
          Services, including the content, accuracy, offensiveness, opinions, reliability, privacy
          practices, or other policies of or contained in the Third-Party Websites or the
          Third-Party Content. Inclusion of, linking to, or permitting the use or installation of
          any Third-Party Websites or any Third-Party Content does not imply approval or endorsement
          thereof by us. If you decide to leave the Services and access the Third-Party Websites or
          to use or install any Third-Party Content, you do so at your own risk, and you should be
          aware these Legal Terms no longer govern. You should review the applicable terms and
          policies, including privacy and data gathering practices, of any website to which you
          navigate from the Services or relating to any applications you use or install from the
          Services. Any purchases you make through Third-Party Websites will be through other
          websites and from other companies, and we take no responsibility whatsoever in relation to
          such purchases which are exclusively between you and the applicable third party. You agree
          and acknowledge that we do not endorse the products or services offered on Third-Party
          Websites and you shall hold us blameless from any harm caused by your purchase of such
          products or services. Additionally, you shall hold us blameless from any losses sustained
          by you or harm caused to you relating to or resulting in any way from any Third-Party
          Content or any contact with Third-Party Websites.
        </div>
        <br />
        <div id='sitemanage'>
          <strong>12. SERVICES MANAGEMENT</strong>
        </div>
        <div>
          We reserve the right, but not the obligation, to: (1) monitor the Services for violations
          of these Legal Terms; (2) take appropriate legal action against anyone who, in our sole
          discretion, violates the law or these Legal Terms, including without limitation, reporting
          such user to law enforcement authorities; (3) in our sole discretion and without
          limitation, refuse, restrict access to, limit the availability of, or disable (to the
          extent technologically feasible) any of your Contributions or any portion thereof; (4) in
          our sole discretion and without limitation, notice, or liability, to remove from the
          Services or otherwise disable all files and content that are excessive in size or are in
          any way burdensome to our systems; and (5) otherwise manage the Services in a manner
          designed to protect our rights and property and to facilitate the proper functioning of
          the Services.
        </div>
        <br />
        <div id='ppyes'>
          <strong>13. PRIVACY POLICY</strong>
        </div>
        <div>
          We care about data privacy and security. Please review our Privacy Policy:{' '}
          <strong>
            <a href='https://dotabod.com/privacy-policy' target='_blank' rel='noreferrer'>
              https://dotabod.com/privacy-policy
            </a>
          </strong>
          . By using the Services, you agree to be bound by our Privacy Policy, which is
          incorporated into these Legal Terms. Please be advised the Services are hosted in the
          United States. If you access the Services from any other region of the world with laws or
          other requirements governing personal data collection, use, or disclosure that differ from
          applicable laws in the United States, then through your continued use of the Services, you
          are transferring your data to the United States, and you expressly consent to have your
          data transferred to and processed in the United States.
        </div>
        <br />
        <div id='terms'>
          <strong>14. TERM AND TERMINATION</strong>
        </div>
        <div>
          These Legal Terms shall remain in full force and effect while you use the Services.
          WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR
          SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES
          (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON,
          INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT
          CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE
          YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE YOUR ACCOUNT AND ANY CONTENT OR
          INFORMATION THAT YOU POSTED AT ANY TIME, WITHOUT WARNING, IN OUR SOLE DISCRETION.
        </div>
        <br />
        <div>
          If we terminate or suspend your account for any reason, you are prohibited from
          registering and creating a new account under your name, a fake or borrowed name, or the
          name of any third party, even if you may be acting on behalf of the third party. In
          addition to terminating or suspending your account, we reserve the right to take
          appropriate legal action, including without limitation pursuing civil, criminal, and
          injunctive redress.
        </div>
        <br />
        <div id='modifications'>
          <strong>15. MODIFICATIONS AND INTERRUPTIONS</strong>
        </div>
        <div>
          We reserve the right to change, modify, or remove the contents of the Services at any time
          or for any reason at our sole discretion without notice. However, we have no obligation to
          update any information on our Services. We will not be liable to you or any third party
          for any modification, price change, suspension, or discontinuance of the Services.
        </div>
        <br />
        <div>
          We cannot guarantee the Services will be available at all times. We may experience
          hardware, software, or other problems or need to perform maintenance related to the
          Services, resulting in interruptions, delays, or errors. We reserve the right to change,
          revise, update, suspend, discontinue, or otherwise modify the Services at any time or for
          any reason without notice to you. You agree that we have no liability whatsoever for any
          loss, damage, or inconvenience caused by your inability to access or use the Services
          during any downtime or discontinuance of the Services. Nothing in these Legal Terms will
          be construed to obligate us to maintain and support the Services or to supply any
          corrections, updates, or releases in connection therewith.
        </div>
        <br />
        <div id='law'>
          <strong>16. GOVERNING LAW</strong>
        </div>
        <div>
          These Legal Terms and your use of the Services are governed by and construed in accordance
          with the laws of the State of Texas applicable to agreements made and to be entirely
          performed within the State of Texas, without regard to its conflict of law principles.
        </div>
        <br />
        <div id='disputes'>
          <strong>17. DISPUTE RESOLUTION</strong>
        </div>
        <div>
          <strong>Binding Arbitration</strong>
        </div>
        <div>
          If the Parties are unable to resolve a Dispute through informal negotiations, the Dispute
          (except those Disputes expressly excluded below) will be finally and exclusively resolved
          by binding arbitration. YOU UNDERSTAND THAT WITHOUT THIS PROVISION, YOU WOULD HAVE THE
          RIGHT TO SUE IN COURT AND HAVE A JURY TRIAL. The arbitration shall be commenced and
          conducted under the Commercial Arbitration Rules of the American Arbitration Association
          ("AAA") and, where appropriate, the AAA's Supplementary Procedures for Consumer Related
          Disputes ("AAA Consumer Rules"), both of which are available at the{' '}
          <a href='http://www.adr.org' target='_blank' rel='noreferrer'>
            American Arbitration Association (AAA) website
          </a>
          . Your arbitration fees and your share of arbitrator compensation shall be governed by the
          AAA Consumer Rules and, where appropriate, limited by the AAA Consumer Rules. If such
          costs are determined by the arbitrator to be excessive, we will pay all arbitration fees
          and expenses. The arbitration may be conducted in person, through the submission of
          documents, by phone, or online. The arbitrator will make a decision in writing, but need
          not provide a statement of reasons unless requested by either Party. The arbitrator must
          follow applicable law, and any award may be challenged if the arbitrator fails to do so.
          Except where otherwise required by the applicable AAA rules or applicable law, the
          arbitration will take place in Travis, Texas. Except as otherwise provided herein, the
          Parties may litigate in court to compel arbitration, stay proceedings pending arbitration,
          or to confirm, modify, vacate, or enter judgment on the award entered by the arbitrator.
        </div>
        <br />
        <div>
          If for any reason, a Dispute proceeds in court rather than arbitration, the Dispute shall
          be commenced or prosecuted in the state and federal courts located in Travis, Texas, and
          the Parties hereby consent to, and waive all defenses of lack of personal jurisdiction,
          and forum non conveniens with respect to venue and jurisdiction in such state and federal
          courts. Application of the United Nations Convention on Contracts for the International
          Sale of Goods and the Uniform Computer Information Transaction Act (UCITA) are excluded
          from these Legal Terms.
        </div>
        <br />
        <div>
          In no event shall any Dispute brought by either Party related in any way to the Services
          be commenced more than one (1) years after the cause of action arose. If this provision is
          found to be illegal or unenforceable, then neither Party will elect to arbitrate any
          Dispute falling within that portion of this provision found to be illegal or unenforceable
          and such Dispute shall be decided by a court of competent jurisdiction within the courts
          listed for jurisdiction above, and the Parties agree to submit to the personal
          jurisdiction of that court.
        </div>
        <div>
          <strong>Restrictions</strong>
        </div>
        <div>
          The Parties agree that any arbitration shall be limited to the Dispute between the Parties
          individually. To the full extent permitted by law, (a) no arbitration shall be joined with
          any other proceeding; (b) there is no right or authority for any Dispute to be arbitrated
          on a class-action basis or to utilize class action procedures; and (c) there is no right
          or authority for any Dispute to be brought in a purported representative capacity on
          behalf of the general public or any other persons.
        </div>
        <div>
          <strong>Exceptions to Arbitration</strong>
        </div>
        <div>
          The Parties agree that the following Disputes are not subject to the above provisions
          concerning binding arbitration: (a) any Disputes seeking to enforce or protect, or
          concerning the validity of, any of the intellectual property rights of a Party; (b) any
          Dispute related to, or arising from, allegations of theft, piracy, invasion of privacy, or
          unauthorized use; and (c) any claim for injunctive relief. If this provision is found to
          be illegal or unenforceable, then neither Party will elect to arbitrate any Dispute
          falling within that portion of this provision found to be illegal or unenforceable and
          such Dispute shall be decided by a court of competent jurisdiction within the courts
          listed for jurisdiction above, and the Parties agree to submit to the personal
          jurisdiction of that court.
        </div>
        <br />
        <div id='corrections'>
          <strong>18. CORRECTIONS</strong>
        </div>
        <div>
          There may be information on the Services that contains typographical errors, inaccuracies,
          or omissions, including descriptions, pricing, availability, and various other
          information. We reserve the right to correct any errors, inaccuracies, or omissions and to
          change or update the information on the Services at any time, without prior notice.
        </div>
        <br />
        <div id='disclaimer'>
          <strong>19. DISCLAIMER</strong>
        </div>
        <div>
          THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF
          THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE
          DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE
          THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS
          ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT OR THE CONTENT OF ANY WEBSITES
          OR MOBILE APPLICATIONS LINKED TO THE SERVICES AND WE WILL ASSUME NO LIABILITY OR
          RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2)
          PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS
          TO AND USE OF THE SERVICES, (3) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS
          AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (4)
          ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (5) ANY BUGS,
          VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH THE SERVICES BY
          ANY THIRD PARTY, AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS OR FOR
          ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED,
          TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES. WE DO NOT WARRANT, ENDORSE,
          GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A
          THIRD PARTY THROUGH THE SERVICES, ANY HYPERLINKED WEBSITE, OR ANY WEBSITE OR MOBILE
          APPLICATION FEATURED IN ANY BANNER OR OTHER ADVERTISING, AND WE WILL NOT BE A PARTY TO OR
          IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND ANY THIRD-PARTY
          PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF A PRODUCT OR SERVICE THROUGH
          ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION
          WHERE APPROPRIATE.
        </div>
        <br />
        <div id='liability'>
          <strong>20. LIMITATIONS OF LIABILITY</strong>
        </div>
        <div>
          IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD
          PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE
          DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM
          YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY
          CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO
          THE AMOUNT PAID, IF ANY, BY YOU TO US DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE
          OF ACTION ARISING. CERTAIN US STATE LAWS AND INTERNATIONAL LAWS DO NOT ALLOW LIMITATIONS
          ON IMPLIED WARRANTIES OR THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS
          APPLY TO YOU, SOME OR ALL OF THE ABOVE DISCLAIMERS OR LIMITATIONS MAY NOT APPLY TO YOU,
          AND YOU MAY HAVE ADDITIONAL RIGHTS.
        </div>
        <br />
        <div id='indemnification'>
          <strong>21. INDEMNIFICATION</strong>
        </div>
        <div>
          You agree to defend, indemnify, and hold us harmless, including our subsidiaries,
          affiliates, and all of our respective officers, agents, partners, and employees, from and
          against any loss, damage, liability, claim, or demand, including reasonable attorneys'
          fees and expenses, made by any third party due to or arising out of: (1) use of the
          Services; (2) breach of these Legal Terms; (3) any breach of your representations and
          warranties set forth in these Legal Terms; (4) your violation of the rights of a third
          party, including but not limited to intellectual property rights; or (5) any overt harmful
          act toward any other user of the Services with whom you connected via the Services.
          Notwithstanding the foregoing, we reserve the right, at your expense, to assume the
          exclusive defense and control of any matter for which you are required to indemnify us,
          and you agree to cooperate, at your expense, with our defense of such claims. We will use
          reasonable efforts to notify you of any such claim, action, or proceeding which is subject
          to this indemnification upon becoming aware of it.
        </div>
        <br />
        <div id='userdata'>
          <strong>22. USER DATA</strong>
        </div>
        <div>
          We will maintain certain data that you transmit to the Services for the purpose of
          managing the performance of the Services, as well as data relating to your use of the
          Services. Although we perform regular routine backups of data, you are solely responsible
          for all data that you transmit or that relates to any activity you have undertaken using
          the Services. You agree that we shall have no liability to you for any loss or corruption
          of any such data, and you hereby waive any right of action against us arising from any
          such loss or corruption of such data.
        </div>
        <br />
        <div id='electronic'>
          <strong>23. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</strong>
        </div>
        <div>
          Visiting the Services, sending us emails, and completing online forms constitute
          electronic communications. You consent to receive electronic communications, and you agree
          that all agreements, notices, disclosures, and other communications we provide to you
          electronically, via email and on the Services, satisfy any legal requirement that such
          communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES,
          CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND
          RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES. You hereby waive
          any rights or requirements under any statutes, regulations, rules, ordinances, or other
          laws in any jurisdiction which require an original signature or delivery or retention of
          non-electronic records, or to payments or the granting of credits by any means other than
          electronic means.
        </div>
        <br />
        <div id='california'>
          <strong>24. CALIFORNIA USERS AND RESIDENTS</strong>
        </div>
        <div>
          If any complaint with us is not satisfactorily resolved, you can contact the Complaint
          Assistance Unit of the Division of Consumer Services of the California Department of
          Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento,
          California 95834 or by telephone at (800) 952-5210 or (916) 445-1254.
        </div>
        <br />
        <div id='misc'>
          <strong>25. MISCELLANEOUS</strong>
        </div>
        <div>
          These Legal Terms and any policies or operating rules posted by us on the Services or in
          respect to the Services constitute the entire agreement and understanding between you and
          us. Our failure to exercise or enforce any right or provision of these Legal Terms shall
          not operate as a waiver of such right or provision. These Legal Terms operate to the
          fullest extent permissible by law. We may assign any or all of our rights and obligations
          to others at any time. We shall not be responsible or liable for any loss, damage, delay,
          or failure to act caused by any cause beyond our reasonable control. If any provision or
          part of a provision of these Legal Terms is determined to be unlawful, void, or
          unenforceable, that provision or part of the provision is deemed severable from these
          Legal Terms and does not affect the validity and enforceability of any remaining
          provisions. There is no joint venture, partnership, employment or agency relationship
          created between you and us as a result of these Legal Terms or use of the Services. You
          agree that these Legal Terms will not be construed against us by virtue of having drafted
          them. You hereby waive any and all defenses you may have based on the electronic form of
          these Legal Terms and the lack of signing by the parties hereto to execute these Legal
          Terms.
        </div>
        <br />
        <div id='contact'>
          <strong>26. CONTACT US</strong>
        </div>
        <div>
          In order to resolve a complaint regarding the Services or to receive further information
          regarding use of the Services, please contact us at:
        </div>
        <br />
        <div>
          <strong>Dotabod</strong>
          <br />
          <strong>501 Brazos St</strong>
          <br />
          <strong>Austin, TX 78701</strong>
          <br />
          <strong>United States</strong>
          <br />
          <strong>
            <a href='mailto:tos@dotabod.com'>tos@dotabod.com</a>
          </strong>
        </div>
      </div>
    </div>
  </Container>
)

TermsOfService.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Terms of Service',
        subtitle: 'Read the terms and conditions that govern your use of Dotabod services.',
      }}
      seo={{
        title: 'Terms of Service | Dotabod',
        description: 'Read the terms and conditions that govern your use of Dotabod services.',
        canonicalUrl: 'https://dotabod.com/terms-of-service',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default TermsOfService
