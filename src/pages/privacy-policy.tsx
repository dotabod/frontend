import type { ReactElement } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'

const PrivacyPolicy: NextPageWithLayout = () => (
  <Container className='py-24'>
    <div>
      <header>
        <h1>PRIVACY POLICY</h1>
        <div>
          <strong>Last updated</strong> <strong>February 23, 2025</strong>
        </div>
      </header>
      <section>
        <p>
          This Privacy Notice for Dotabod ("we," "us," or "our") describes how and why we might
          access, collect, store, use, and/or share ("process") your personal information when you
          use our services ("Services"), including when you:
        </p>
        <ul className='list-disc list-inside'>
          <li>
            Visit our website at{' '}
            <a href='https://dotabod.com' target='_blank' rel='noreferrer'>
              https://dotabod.com
            </a>
            , or any website of ours that links to this Privacy Notice
          </li>
          <li>
            Use Dotabod. Dotabod is an open-source toolkit designed to enhance the Dota 2 streaming
            experience through automated game integration and Twitch chat interaction. Built for
            streamers and their audiences, it solves key streaming challenges.
          </li>
          <li>Engage with us in other related ways, including any sales, marketing, or events</li>
        </ul>
        <p>
          <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you
          understand your privacy rights and choices. We are responsible for making decisions about
          how your personal information is processed. If you do not agree with our policies and
          practices, please do not use our Services. If you still have any questions or concerns,
          please contact us at <a href='mailto:privacy@dotabod.com'>privacy@dotabod.com</a>.
        </p>
      </section>
      <section>
        <h2>SUMMARY OF KEY POINTS</h2>
        <p>
          <strong>
            <em>
              This summary provides key points from our Privacy Notice, but you can find out more
              details about any of these topics by clicking the link following each key point or by
              using our{' '}
            </em>
          </strong>
          <a href='#toc'>
            <strong>
              <em>table of contents</em>
            </strong>
          </a>
          <strong>
            <em> below to find the section you are looking for.</em>
          </strong>
        </p>
        <ul className='list-disc list-inside'>
          <li>
            <strong>What personal information do we process?</strong> When you visit, use, or
            navigate our Services, we may process personal information depending on how you interact
            with us and the Services, the choices you make, and the products and features you use.
            Learn more about
            <a href='#personalinfo'>personal information you disclose to us</a>.
          </li>
          <li>
            <strong>Do we process any sensitive personal information?</strong> We do not process
            sensitive personal information.
          </li>
          <li>
            <strong>Do we collect any information from third parties?</strong> We do not collect any
            information from third parties.
          </li>
          <li>
            <strong>How do we process your information?</strong> We process your information to
            provide, improve, and administer our Services, communicate with you, for security and
            fraud prevention, and to comply with law. We may also process your information for other
            purposes with your consent. We process your information only when we have a valid legal
            reason to do so. Learn more about
            <a href='#infouse'>how we process your information</a>.
          </li>
          <li>
            <strong>
              In what situations and with which parties do we share personal information?
            </strong>{' '}
            We may share information in specific situations and with specific third parties. Learn
            more about
            <a href='#whoshare'>when and with whom we share your personal information</a>.
          </li>
          <li>
            <strong>How do we keep your information safe?</strong> We have organizational and
            technical processes and procedures in place to protect your personal information.
            However, no electronic transmission over the internet or information storage technology
            can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers,
            cybercriminals, or other unauthorized third parties will not be able to defeat our
            security and improperly collect, access, steal, or modify your information. Learn more
            about
            <a href='#infosafe'>how we keep your information safe</a>.
          </li>
          <li>
            <strong>What are your rights?</strong> Depending on where you are located
            geographically, the applicable privacy law may mean you have certain rights regarding
            your personal information. Learn more about
            <a href='#privacyrights'>your privacy rights</a>.
          </li>
          <li>
            <strong>How do you exercise your rights?</strong> The easiest way to exercise your
            rights is by visiting
            <a href='https://dotabod.com/dashboard/data' target='_blank' rel='noreferrer'>
              https://dotabod.com/dashboard/data
            </a>
            , or by contacting us. We will consider and act upon any request in accordance with
            applicable data protection laws.
          </li>
          <li>
            Want to learn more about what we do with any information we collect?
            <a href='#toc'>Review the Privacy Notice in full</a>.
          </li>
        </ul>
      </section>
      <section id='toc'>
        <h2>TABLE OF CONTENTS</h2>
        <ol>
          <li>
            <a href='#infocollect'>WHAT INFORMATION DO WE COLLECT?</a>
          </li>
          <li>
            <a href='#infouse'>HOW DO WE PROCESS YOUR INFORMATION?</a>
          </li>
          <li>
            <a href='#legalbases'>
              WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?
            </a>
          </li>
          <li>
            <a href='#whoshare'>WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a>
          </li>
          <li>
            <a href='#cookies'>DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</a>
          </li>
          <li>
            <a href='#sociallogins'>HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a>
          </li>
          <li>
            <a href='#inforetain'>HOW LONG DO WE KEEP YOUR INFORMATION?</a>
          </li>
          <li>
            <a href='#infosafe'>HOW DO WE KEEP YOUR INFORMATION SAFE?</a>
          </li>
          <li>
            <a href='#infominors'>DO WE COLLECT INFORMATION FROM MINORS?</a>
          </li>
          <li>
            <a href='#privacyrights'>WHAT ARE YOUR PRIVACY RIGHTS?</a>
          </li>
          <li>
            <a href='#DNT'>CONTROLS FOR DO-NOT-TRACK FEATURES</a>
          </li>
          <li>
            <a href='#uslaws'>DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a>
          </li>
          <li>
            <a href='#policyupdates'>DO WE MAKE UPDATES TO THIS NOTICE?</a>
          </li>
          <li>
            <a href='#contact'>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a>
          </li>
          <li>
            <a href='#request'>
              HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
            </a>
          </li>
        </ol>
      </section>
      <section id='infocollect'>
        <h2>1. WHAT INFORMATION DO WE COLLECT?</h2>
        <h3 id='personalinfo'>Personal information you disclose to us</h3>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We collect personal information that you provide to us.
        </p>
        <p>
          We collect personal information that you voluntarily provide to us when you register on
          the Services, express an interest in obtaining information about us or our products and
          Services, when you participate in activities on the Services, or otherwise when you
          contact us.
        </p>
        <p id='sensitiveinfo'>
          <strong>Sensitive Information.</strong> We do not process sensitive information.
        </p>
        <p>
          <strong>Payment Data.</strong> We may collect data necessary to process your payment if
          you choose to make purchases, such as your payment instrument number, and the security
          code associated with your payment instrument. All payment data is handled and stored by
          <a href='https://stripe.com/privacy' target='_blank' rel='noreferrer'>
            Stripe
          </a>
          . You may find their privacy notice link(s) here:
          <a href='https://stripe.com/privacy' target='_blank' rel='noreferrer'>
            https://stripe.com/privacy
          </a>
          .
        </p>
        <p>
          <strong>Social Media Login Data.</strong> We may provide you with the option to register
          with us using your existing social media account details, like your Facebook, X, or other
          social media account. If you choose to register in this way, we will collect certain
          profile information about you from the social media provider, as described in the section
          called
          <a href='#sociallogins'>HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a> below.
        </p>
        <p>
          All personal information that you provide to us must be true, complete, and accurate, and
          you must notify us of any changes to such personal information.
        </p>
        <h3>Information automatically collected</h3>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          Some information — such as your Internet Protocol (IP) address and/or browser and device
          characteristics — is collected automatically when you visit our Services.
        </p>
        <p>
          We automatically collect certain information when you visit, use, or navigate the
          Services. This information does not reveal your specific identity (like your name or
          contact information) but may include device and usage information, such as your IP
          address, browser and device characteristics, operating system, language preferences,
          referring URLs, device name, country, location, information about how and when you use our
          Services, and other technical information. This information is primarily needed to
          maintain the security and operation of our Services, and for our internal analytics and
          reporting purposes.
        </p>
        <p>
          Like many businesses, we also collect information through cookies and similar
          technologies. You can find out more about this in our Cookie Policy:
          <a href='https://dotabod.com/cookies' target='_blank' rel='noreferrer'>
            https://dotabod.com/cookies
          </a>
          .
        </p>
        <p>The information we collect includes:</p>
        <ul className='list-disc list-inside'>
          <li>
            <em>Log and Usage Data.</em> Log and usage data is service-related, diagnostic, usage,
            and performance information our servers automatically collect when you access or use our
            Services and which we record in log files. Depending on how you interact with us, this
            log data may include your IP address, device information, browser type, and settings and
            information about your activity in the Services (such as the date/time stamps associated
            with your usage, pages and files viewed, searches, and other actions you take such as
            which features you use), device event information (such as system activity, error
            reports (sometimes called "crash dumps"), and hardware settings).
          </li>
        </ul>
        <h3>Google API</h3>
        <p>
          Our use of information received from Google APIs will adhere to
          <a
            href='https://developers.google.com/terms/api-services-user-data-policy'
            target='_blank'
            rel='noreferrer'
          >
            Google API Services User Data Policy
          </a>
          , including the
          <a
            href='https://developers.google.com/terms/api-services-user-data-policy#limited-use'
            target='_blank'
            rel='noreferrer'
          >
            Limited Use requirements
          </a>
          .
        </p>
      </section>
      <section id='infouse'>
        <h2>2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We process your information to provide, improve, and administer our Services, communicate
          with you, for security and fraud prevention, and to comply with law. We may also process
          your information for other purposes with your consent.
        </p>
        <p>
          <strong>
            We process your personal information for a variety of reasons, depending on how you
            interact with our Services, including:
          </strong>
        </p>
        <ul className='list-disc list-inside'>
          <li>
            <strong>
              To facilitate account creation and authentication and otherwise manage user accounts.
            </strong>{' '}
            We may process your information so you can create and log in to your account, as well as
            keep your account in working order.
          </li>
          <li>
            <strong>To deliver and facilitate delivery of services to the user.</strong> We may
            process your information to provide you with the requested service.
          </li>
          <li>
            <strong>To respond to user inquiries/offer support to users.</strong> We may process
            your information to respond to your inquiries and solve any potential issues you might
            have with the requested service.
          </li>
          <li>
            <strong>To send administrative information to you.</strong> We may process your
            information to send you details about our products and services, changes to our terms
            and policies, and other similar information.
          </li>
          <li>
            <strong>To fulfill and manage your orders.</strong> We may process your information to
            fulfill and manage your orders, payments, returns, and exchanges made through the
            Services.
          </li>
          <li>
            <strong>To enable user-to-user communications.</strong> We may process your information
            if you choose to use any of our offerings that allow for communication with another
            user.
          </li>
          <li>
            <strong>To request feedback.</strong> We may process your information when necessary to
            request feedback and to contact you about your use of our Services.
          </li>
          <li>
            <strong>To protect our Services.</strong> We may process your information as part of our
            efforts to keep our Services safe and secure, including fraud monitoring and prevention.
          </li>
          <li>
            <strong>To identify usage trends.</strong> We may process information about how you use
            our Services to better understand how they are being used so we can improve them.
          </li>
          <li>
            <strong>
              To determine the effectiveness of our marketing and promotional campaigns.
            </strong>{' '}
            We may process your information to better understand how to provide marketing and
            promotional campaigns that are most relevant to you.
          </li>
          <li>
            <strong>To save or protect an individual's vital interest.</strong> We may process your
            information when necessary to save or protect an individual's vital interest, such as to
            prevent harm.
          </li>
        </ul>
      </section>
      <section id='legalbases'>
        <h2>3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We only process your personal information when we believe it is necessary and we have a
          valid legal reason (i.e., legal basis) to do so under applicable law, like with your
          consent, to comply with laws, to provide you with services to enter into or fulfill our
          contractual obligations, to protect your rights, or to fulfill our legitimate business
          interests.
        </p>
        <h3>
          <u>
            <em>If you are located in the EU or UK, this section applies to you.</em>
          </u>
        </h3>
        <p>
          The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid
          legal bases we rely on in order to process your personal information. As such, we may rely
          on the following legal bases to process your personal information:
        </p>
        <ul className='list-disc list-inside'>
          <li>
            <strong>Consent.</strong> We may process your information if you have given us
            permission (i.e., consent) to use your personal information for a specific purpose. You
            can withdraw your consent at any time. Learn more about
            <a href='#withdrawconsent'>withdrawing your consent</a>.
          </li>
          <li>
            <strong>Performance of a Contract.</strong> We may process your personal information
            when we believe it is necessary to fulfill our contractual obligations to you, including
            providing our Services or at your request prior to entering into a contract with you.
          </li>
          <li>
            <strong>Legitimate Interests.</strong> We may process your information when we believe
            it is reasonably necessary to achieve our legitimate business interests and those
            interests do not outweigh your interests and fundamental rights and freedoms. For
            example, we may process your personal information for some of the purposes described in
            order to:
            <ul className='list-disc list-inside'>
              <li>
                Analyze how our Services are used so we can improve them to engage and retain users
              </li>
              <li>Support our marketing activities</li>
              <li>Diagnose problems and/or prevent fraudulent activities</li>
              <li>
                Understand how our users use our products and services so we can improve user
                experience
              </li>
            </ul>
          </li>
          <li>
            <strong>Legal Obligations.</strong> We may process your information where we believe it
            is necessary for compliance with our legal obligations, such as to cooperate with a law
            enforcement body or regulatory agency, exercise or defend our legal rights, or disclose
            your information as evidence in litigation in which we are involved.
          </li>
          <li>
            <strong>Vital Interests.</strong> We may process your information where we believe it is
            necessary to protect your vital interests or the vital interests of a third party, such
            as situations involving potential threats to the safety of any person.
          </li>
        </ul>
        <h3>
          <u>
            <em>If you are located in Canada, this section applies to you.</em>
          </u>
        </h3>
        <p>
          We may process your information if you have given us specific permission (i.e., express
          consent) to use your personal information for a specific purpose, or in situations where
          your permission can be inferred (i.e., implied consent). You can
          <a href='#withdrawconsent'>withdraw your consent</a> at any time.
        </p>
        <p>
          In some exceptional cases, we may be legally permitted under applicable law to process
          your information without your consent, including, for example:
        </p>
        <ul className='list-disc list-inside'>
          <li>
            If collection is clearly in the interests of an individual and consent cannot be
            obtained in a timely way
          </li>
          <li>For investigations and fraud detection and prevention</li>
          <li>For business transactions provided certain conditions are met</li>
          <li>
            If it is contained in a witness statement and the collection is necessary to assess,
            process, or settle an insurance claim
          </li>
          <li>
            For identifying injured, ill, or deceased persons and communicating with next of kin
          </li>
          <li>
            If we have reasonable grounds to believe an individual has been, is, or may be victim of
            financial abuse
          </li>
          <li>
            If it is reasonable to expect collection and use with consent would compromise the
            availability or the accuracy of the information and the collection is reasonable for
            purposes related to investigating a breach of an agreement or a contravention of the
            laws of Canada or a province
          </li>
          <li>
            If disclosure is required to comply with a subpoena, warrant, court order, or rules of
            the court relating to the production of records
          </li>
          <li>
            If it was produced by an individual in the course of their employment, business, or
            profession and the collection is consistent with the purposes for which the information
            was produced
          </li>
          <li>If the collection is solely for journalistic, artistic, or literary purposes</li>
          <li>If the information is publicly available and is specified by the regulations</li>
        </ul>
      </section>
      <section id='whoshare'>
        <h2>4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We may share information in specific situations described in this section and/or with the
          following third parties.
        </p>
        <p>We may need to share your personal information in the following situations:</p>
        <ul className='list-disc list-inside'>
          <li>
            <strong>Business Transfers.</strong> We may share or transfer your information in
            connection with, or during negotiations of, any merger, sale of company assets,
            financing, or acquisition of all or a portion of our business to another company.
          </li>
          <li>
            <strong>Business Partners.</strong> We may share your information with our business
            partners to offer you certain products, services, or promotions.
          </li>
        </ul>
      </section>
      <section id='cookies'>
        <h2>5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We may use cookies and other tracking technologies to collect and store your information.
        </p>
        <p>
          We may use cookies and similar tracking technologies (like web beacons and pixels) to
          gather information when you interact with our Services. Some online tracking technologies
          help us maintain the security of our Services and your account, prevent crashes, fix bugs,
          save your preferences, and assist with basic site functions.
        </p>
        <p>
          We also permit third parties and service providers to use online tracking technologies on
          our Services for analytics and advertising, including to help manage and display
          advertisements, to tailor advertisements to your interests, or to send abandoned shopping
          cart reminders (depending on your communication preferences). The third parties and
          service providers use their technology to provide advertising about products and services
          tailored to your interests which may appear either on our Services or on other websites.
        </p>
        <p>
          To the extent these online tracking technologies are deemed to be a "sale"/"sharing"
          (which includes targeted advertising, as defined under the applicable laws) under
          applicable US state laws, you can opt out of these online tracking technologies by
          submitting a request as described below under section
          <a href='#uslaws'>DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a>
        </p>
        <p>
          Specific information about how we use such technologies and how you can refuse certain
          cookies is set out in our Cookie Policy:
          <a href='https://dotabod.com/cookies' target='_blank' rel='noreferrer'>
            https://dotabod.com/cookies
          </a>
          .
        </p>
        <h3>Google Analytics</h3>
        <p>
          We may share your information with Google Analytics to track and analyze the use of the
          Services. The Google Analytics Advertising Features that we may use include: Google
          Analytics Demographics and Interests Reporting. To opt out of being tracked by Google
          Analytics across the Services, visit
          <a href='https://tools.google.com/dlpage/gaoptout' target='_blank' rel='noreferrer'>
            https://tools.google.com/dlpage/gaoptout
          </a>
          . You can opt out of Google Analytics Advertising Features through
          <a href='https://adssettings.google.com/' target='_blank' rel='noreferrer'>
            Ads Settings
          </a>{' '}
          and Ad Settings for mobile apps. Other opt out means include
          <a href='http://optout.networkadvertising.org/' target='_blank' rel='noreferrer'>
            http://optout.networkadvertising.org/
          </a>{' '}
          and
          <a
            href='http://www.networkadvertising.org/mobile-choice'
            target='_blank'
            rel='noreferrer'
          >
            http://www.networkadvertising.org/mobile-choice
          </a>
          . For more information on the privacy practices of Google, please visit the
          <a href='https://policies.google.com/privacy' target='_blank' rel='noreferrer'>
            Google Privacy &amp; Terms page
          </a>
          .
        </p>
      </section>
      <section id='sociallogins'>
        <h2>6. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          If you choose to register or log in to our Services using a social media account, we may
          have access to certain information about you.
        </p>
        <p>
          Our Services offer you the ability to register and log in using your third-party social
          media account details (like your Facebook or X logins). Where you choose to do this, we
          will receive certain profile information about you from your social media provider. The
          profile information we receive may vary depending on the social media provider concerned,
          but will often include your name, email address, friends list, and profile picture, as
          well as other information you choose to make public on such a social media platform.
        </p>
        <p>
          We will use the information we receive only for the purposes that are described in this
          Privacy Notice or that are otherwise made clear to you on the relevant Services. Please
          note that we do not control, and are not responsible for, other uses of your personal
          information by your third-party social media provider. We recommend that you review their
          privacy notice to understand how they collect, use, and share your personal information,
          and how you can set your privacy preferences on their sites and apps.
        </p>
      </section>
      <section id='inforetain'>
        <h2>7. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We keep your information for as long as necessary to fulfill the purposes outlined in this
          Privacy Notice unless otherwise required by law.
        </p>
        <p>
          We will only keep your personal information for as long as it is necessary for the
          purposes set out in this Privacy Notice, unless a longer retention period is required or
          permitted by law (such as tax, accounting, or other legal requirements). No purpose in
          this notice will require us keeping your personal information for longer than the period
          of time in which users have an account with us.
        </p>
        <p>
          When we have no ongoing legitimate business need to process your personal information, we
          will either delete or anonymize such information, or, if this is not possible (for
          example, because your personal information has been stored in backup archives), then we
          will securely store your personal information and isolate it from any further processing
          until deletion is possible.
        </p>
      </section>
      <section id='infosafe'>
        <h2>8. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We aim to protect your personal information through a system of organizational and
          technical security measures.
        </p>
        <p>
          We have implemented appropriate and reasonable technical and organizational security
          measures designed to protect the security of any personal information we process. However,
          despite our safeguards and efforts to secure your information, no electronic transmission
          over the Internet or information storage technology can be guaranteed to be 100% secure,
          so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized
          third parties will not be able to defeat our security and improperly collect, access,
          steal, or modify your information. Although we will do our best to protect your personal
          information, transmission of personal information to and from our Services is at your own
          risk. You should only access the Services within a secure environment.
        </p>
      </section>
      <section id='infominors'>
        <h2>9. DO WE COLLECT INFORMATION FROM MINORS?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          We do not knowingly collect data from or market to children under 18 years of age.
        </p>
        <p>
          We do not knowingly collect, solicit data from, or market to children under 18 years of
          age, nor do we knowingly sell such personal information. By using the Services, you
          represent that you are at least 18 or that you are the parent or guardian of such a minor
          and consent to such minor dependent's use of the Services. If we learn that personal
          information from users less than 18 years of age has been collected, we will deactivate
          the account and take reasonable measures to promptly delete such data from our records. If
          you become aware of any data we may have collected from children under age 18, please
          contact us at
          <a href='mailto:dpo@dotabod.com'>dpo@dotabod.com</a>.
        </p>
      </section>
      <section id='privacyrights'>
        <h2>10. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          Depending on your state of residence in the US or in some regions, such as the European
          Economic Area (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that
          allow you greater access to and control over your personal information. You may review,
          change, or terminate your account at any time, depending on your country, province, or
          state of residence.
        </p>
        <p>
          In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under
          applicable data protection laws. These may include the right (i) to request access and
          obtain a copy of your personal information, (ii) to request rectification or erasure;
          (iii) to restrict the processing of your personal information; (iv) if applicable, to data
          portability; and (v) not to be subject to automated decision-making. In certain
          circumstances, you may also have the right to object to the processing of your personal
          information. You can make such a request by contacting us by using the contact details
          provided in the section
          <a href='#contact'>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a> below.
        </p>
        <p>
          We will consider and act upon any request in accordance with applicable data protection
          laws.
        </p>
        <p>
          If you are located in the EEA or UK and you believe we are unlawfully processing your
          personal information, you also have the right to complain to your
          <a
            href='https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm'
            target='_blank'
            rel='noreferrer'
          >
            Member State data protection authority
          </a>{' '}
          or
          <a
            href='https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/'
            target='_blank'
            rel='noreferrer'
          >
            UK data protection authority
          </a>
          .
        </p>
        <p>
          If you are located in Switzerland, you may contact the
          <a href='https://www.edoeb.admin.ch/edoeb/en/home.html' target='_blank' rel='noreferrer'>
            Federal Data Protection and Information Commissioner
          </a>
          .
        </p>
        <h3 id='withdrawconsent'>
          <u>Withdrawing your consent:</u>
        </h3>
        <p>
          If we are relying on your consent to process your personal information, which may be
          express and/or implied consent depending on the applicable law, you have the right to
          withdraw your consent at any time. You can withdraw your consent at any time by contacting
          us by using the contact details provided in the section
          <a href='#contact'>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a> below.
        </p>
        <p>
          However, please note that this will not affect the lawfulness of the processing before its
          withdrawal nor, when applicable law allows, will it affect the processing of your personal
          information conducted in reliance on lawful processing grounds other than consent.
        </p>
        <h3>Account Information</h3>
        <p>
          If you would at any time like to review or change the information in your account or
          terminate your account, you can:
        </p>
        <ul className='list-disc list-inside'>
          <li>Log in to your account settings and update your user account.</li>
        </ul>
        <p>
          Upon your request to terminate your account, we will deactivate or delete your account and
          information from our active databases. However, we may retain some information in our
          files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our
          legal terms and/or comply with applicable legal requirements.
        </p>
        <h3>
          <u>Cookies and similar technologies:</u>
        </h3>
        <p>
          Most Web browsers are set to accept cookies by default. If you prefer, you can usually
          choose to set your browser to remove cookies and to reject cookies. If you choose to
          remove cookies or reject cookies, this could affect certain features or services of our
          Services. For further information, please see our Cookie Policy:
          <a href='https://dotabod.com/cookies' target='_blank' rel='noreferrer'>
            https://dotabod.com/cookies
          </a>
          .
        </p>
        <p>
          If you have questions or comments about your privacy rights, you may email us at
          <a href='mailto:privacy@dotabod.com'>privacy@dotabod.com</a>.
        </p>
      </section>
      <section id='DNT'>
        <h2>11. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
        <p>
          Most web browsers and some mobile operating systems and mobile applications include a
          Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference
          not to have data about your online browsing activities monitored and collected. At this
          stage, no uniform technology standard for recognizing and implementing DNT signals has
          been finalized. As such, we do not currently respond to DNT browser signals or any other
          mechanism that automatically communicates your choice not to be tracked online. If a
          standard for online tracking is adopted that we must follow in the future, we will inform
          you about that practice in a revised version of this Privacy Notice.
        </p>
        <p>
          California law requires us to let you know how we respond to web browser DNT signals.
          Because there currently is not an industry or legal standard for recognizing or honoring
          DNT signals, we do not respond to them at this time.
        </p>
      </section>
      <section id='uslaws'>
        <h2>12. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana,
          Iowa, Kentucky, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon,
          Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and
          receive details about the personal information we maintain about you and how we have
          processed it, correct inaccuracies, get a copy of, or delete your personal information.
          You may also have the right to withdraw your consent to our processing of your personal
          information. These rights may be limited in some circumstances by applicable law. More
          information is provided below.
        </p>
        <h3>Categories of Personal Information We Collect</h3>
        <p>
          We have collected the following categories of personal information in the past twelve (12)
          months:
        </p>
        <table>
          <tbody>
            <tr>
              <th>Category</th>
              <th>Examples</th>
              <th style={{ textAlign: 'center' }}>Collected</th>
            </tr>
            <tr>
              <td>A. Identifiers</td>
              <td>
                Contact details, such as real name, alias, postal address, telephone or mobile
                contact number, unique personal identifier, online identifier, Internet Protocol
                address, email address, and account name
              </td>
              <td style={{ textAlign: 'center' }}>YES</td>
            </tr>
            <tr>
              <td>B. Personal information as defined in the California Customer Records statute</td>
              <td>
                Name, contact information, education, employment, employment history, and financial
                information
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>C. Protected classification characteristics under state or federal law</td>
              <td>
                Gender, age, date of birth, race and ethnicity, national origin, marital status, and
                other demographic data
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>D. Commercial information</td>
              <td>
                Transaction information, purchase history, financial details, and payment
                information
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>E. Biometric information</td>
              <td>Fingerprints and voiceprints</td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>F. Internet or other similar network activity</td>
              <td>
                Browsing history, search history, online behavior, interest data, and interactions
                with our and other websites, applications, systems, and advertisements
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>G. Geolocation data</td>
              <td>Device location</td>
              <td style={{ textAlign: 'center' }}>YES</td>
            </tr>
            <tr>
              <td>H. Audio, electronic, sensory, or similar information</td>
              <td>
                Images and audio, video or call recordings created in connection with our business
                activities
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>I. Professional or employment-related information</td>
              <td>
                Business contact details in order to provide you our Services at a business level or
                job title, work history, and professional qualifications if you apply for a job with
                us
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>J. Education Information</td>
              <td>Student records and directory information</td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>K. Inferences drawn from collected personal information</td>
              <td>
                Inferences drawn from any of the collected personal information listed above to
                create a profile or summary about, for example, an individual's preferences and
                characteristics
              </td>
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
            <tr>
              <td>L. Sensitive personal Information</td>
              <td />
              <td style={{ textAlign: 'center' }}>NO</td>
            </tr>
          </tbody>
        </table>
        <p>
          We may also collect other personal information outside of these categories through
          instances where you interact with us in person, online, or by phone or mail in the context
          of:
        </p>
        <ul className='list-disc list-inside'>
          <li>Receiving help through our customer support channels;</li>
          <li>Participation in customer surveys or contests; and</li>
          <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
        </ul>
        <p>
          We will use and retain the collected personal information as needed to provide the
          Services or for:
        </p>
        <ul className='list-disc list-inside'>
          <li>Category A - As long as the user has an account with us</li>
          <li>Category G - As long as the user has an account with us</li>
        </ul>
        <h3>Sources of Personal Information</h3>
        <p>
          Learn more about the sources of personal information we collect in
          <a href='#infocollect'>WHAT INFORMATION DO WE COLLECT?</a>
        </p>
        <h3>How We Use and Share Personal Information</h3>
        <p>
          Learn more about how we use your personal information in the section,
          <a href='#infouse'>HOW DO WE PROCESS YOUR INFORMATION?</a>
        </p>
        <p>
          <strong>Will your information be shared with anyone else?</strong>
        </p>
        <p>
          We may disclose your personal information with our service providers pursuant to a written
          contract between us and each service provider. Learn more about how we disclose personal
          information to in the section,
          <a href='#whoshare'>WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a>
        </p>
        <p>
          We may use your personal information for our own business purposes, such as for
          undertaking internal research for technological development and demonstration. This is not
          considered to be "selling" of your personal information.
        </p>
        <p>
          We have not disclosed, sold, or shared any personal information to third parties for a
          business or commercial purpose in the preceding twelve (12) months. We will not sell or
          share personal information in the future belonging to website visitors, users, and other
          consumers.
        </p>
        <h3>Your Rights</h3>
        <p>
          You have rights under certain US state data protection laws. However, these rights are not
          absolute, and in certain cases, we may decline your request as permitted by law. These
          rights include:
        </p>
        <ul className='list-disc list-inside'>
          <li>
            <strong>Right to know</strong> whether or not we are processing your personal data
          </li>
          <li>
            <strong>Right to access</strong> your personal data
          </li>
          <li>
            <strong>Right to correct</strong> inaccuracies in your personal data
          </li>
          <li>
            <strong>Right to request</strong> the deletion of your personal data
          </li>
          <li>
            <strong>Right to obtain a copy</strong> of the personal data you previously shared with
            us
          </li>
          <li>
            <strong>Right to non-discrimination</strong> for exercising your rights
          </li>
          <li>
            <strong>Right to opt out</strong> of the processing of your personal data if it is used
            for targeted advertising (or sharing as defined under California's privacy law), the
            sale of personal data, or profiling in furtherance of decisions that produce legal or
            similarly significant effects ("profiling")
          </li>
        </ul>
        <p>Depending upon the state where you live, you may also have the following rights:</p>
        <ul className='list-disc list-inside'>
          <li>
            Right to access the categories of personal data being processed (as permitted by
            applicable law, including Minnesota's privacy law)
          </li>
          <li>
            Right to obtain a list of the categories of third parties to which we have disclosed
            personal data (as permitted by applicable law, including California's and Delaware's
            privacy law)
          </li>
          <li>
            Right to obtain a list of specific third parties to which we have disclosed personal
            data (as permitted by applicable law, including Minnesota's and Oregon's privacy law)
          </li>
          <li>
            Right to review, understand, question, and correct how personal data has been profiled
            (as permitted by applicable law, including Minnesota's privacy law)
          </li>
          <li>
            Right to limit use and disclosure of sensitive personal data (as permitted by applicable
            law, including California's privacy law)
          </li>
          <li>
            Right to opt out of the collection of sensitive data and personal data collected through
            the operation of a voice or facial recognition feature (as permitted by applicable law,
            including Florida's privacy law)
          </li>
        </ul>
        <h3>How to Exercise Your Rights</h3>
        <p>
          To exercise these rights, you can contact us by visiting
          <a href='https://dotabod.com/dashboard/data' target='_blank' rel='noreferrer'>
            https://dotabod.com/dashboard/data
          </a>
          , by emailing us at
          <a href='mailto:usprivacy@dotabod.com'>usprivacy@dotabod.com</a>, or by referring to the
          contact details at the bottom of this document.
        </p>
        <h3>Request Verification</h3>
        <p>
          Upon receiving your request, we will need to verify your identity to determine you are the
          same person about whom we have the information in our system. We will only use personal
          information provided in your request to verify your identity or authority to make the
          request. However, if we cannot verify your identity from the information already
          maintained by us, we may request that you provide additional information for the purposes
          of verifying your identity and for security or fraud-prevention purposes.
        </p>
        <p>
          If you submit the request through an authorized agent, we may need to collect additional
          information to verify your identity before processing your request and the agent will need
          to provide a written and signed permission from you to submit such request on your behalf.
        </p>
        <h3>Appeals</h3>
        <p>
          Under certain US state data protection laws, if we decline to take action regarding your
          request, you may appeal our decision by emailing us at
          <a href='mailto:privacy@dotabod.com'>privacy@dotabod.com</a>. We will inform you in
          writing of any action taken or not taken in response to the appeal, including a written
          explanation of the reasons for the decisions. If your appeal is denied, you may submit a
          complaint to your state attorney general.
        </p>
        <h3>California "Shine The Light" Law</h3>
        <p>
          California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits
          our users who are California residents to request and obtain from us, once a year and free
          of charge, information about categories of personal information (if any) we disclosed to
          third parties for direct marketing purposes and the names and addresses of all third
          parties with which we shared personal information in the immediately preceding calendar
          year. If you are a California resident and would like to make such a request, please
          submit your request in writing to us by using the contact details provided in the section
          <a href='#contact'>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a>
        </p>
      </section>
      <section id='policyupdates'>
        <h2>13. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
        <p>
          <strong>
            <em>In Short:</em>
          </strong>{' '}
          Yes, we will update this notice as necessary to stay compliant with relevant laws.
        </p>
        <p>
          We may update this Privacy Notice from time to time. The updated version will be indicated
          by an updated "Revised" date at the top of this Privacy Notice. If we make material
          changes to this Privacy Notice, we may notify you either by prominently posting a notice
          of such changes or by directly sending you a notification. We encourage you to review this
          Privacy Notice frequently to be informed of how we are protecting your information.
        </p>
      </section>
      <section id='contact'>
        <h2>14. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
        <p>
          If you have questions or comments about this notice, you may contact our Data Protection
          Officer (DPO) by email at
          <a href='mailto:dpo@dotabod.com'>dpo@dotabod.com</a>, or contact us by post at:
        </p>
        <address>
          Dotabod
          <br />
          Data Protection Officer
          <br />
          501 Brazos St
          <br />
          Austin, TX 78701
          <br />
          United States
        </address>
      </section>
      <section id='request'>
        <h2>15. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
        <p>
          You have the right to request access to the personal information we collect from you,
          details about how we have processed it, correct inaccuracies, or delete your personal
          information. You may also have the right to withdraw your consent to our processing of
          your personal information. These rights may be limited in some circumstances by applicable
          law. To request to review, update, or delete your personal information, please visit:
          <a href='https://dotabod.com/dashboard/data' target='_blank' rel='noreferrer'>
            https://dotabod.com/dashboard/data
          </a>
          .
        </p>
      </section>
    </div>
  </Container>
)

PrivacyPolicy.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Privacy Policy',
        subtitle: 'Learn about how Dotabod collects, uses, and protects your personal information.',
      }}
      seo={{
        title: 'Privacy Policy | Dotabod',
        description:
          'Learn about how Dotabod collects, uses, and protects your personal information.',
        canonicalUrl: 'https://dotabod.com/privacy-policy',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default PrivacyPolicy
