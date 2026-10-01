import SiteHeader from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const H2 = ({ children }) => (
  <h2 className="font-manrope font-semibold text-2xl md:text-3xl text-[#E8799B] mt-12 mb-4">{children}</h2>
);
const H3 = ({ children }) => (
  <h3 className="font-manrope font-semibold text-lg md:text-xl text-[#E8799B] mt-8 mb-3">{children}</h3>
);
const H4 = ({ children }) => (
  <h4 className="font-manrope font-semibold text-sm md:text-base text-[#E8799B] mt-6 mb-2">{children}</h4>
);
const P = ({ children }) => (
  <p className="text-[#B8B8BE] text-sm leading-relaxed mb-4">{children}</p>
);
const UL = ({ items }) => (
  <ul className="list-disc pl-5 text-[#B8B8BE] text-sm leading-relaxed mb-4 space-y-1.5">
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);

export default function TermsPrivacy() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F0ED]" data-testid="terms-privacy-page">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-6 pt-28 md:pt-32 pb-20">
        <h1 className="font-manrope font-semibold text-4xl md:text-5xl text-[#E8799B] mb-2">Terms, Privacy &amp; Cookies</h1>
        <p className="text-[#71717A] text-xs mb-8">Elite Escorts Europe — last updated {new Date().getFullYear()}</p>

        {/* Introduction */}
        <H2>Introduction</H2>
        <P>www.eliteescortseurope.com is not an escort agency. We are an advertising platform, portal website, for independent models and escort agencies with the aim of bringing adults in contact with each other. www.eliteescortseurope.com doesn't arrange meetings itself, we only provide an advertising space.</P>
        <P>Adults, both in advertiser and user, are clearly defined as the minimum age required by the law of your country (Belgium = 18 years old) to use www.eliteescortseurope.com. We can therefore not guarantee that any expectations will be met or vouch for anyone's behaviour. When using our website, you must always respect the rights and obligations stated on the website as described in the Terms and Conditions.</P>

        {/* About our website */}
        <H2>About our website</H2>

        <H3>Operation, security and availability</H3>
        <P>Www.eliteescortseurope.eu provides a user-friendly website that is safe for all visitors. We take all reasonable steps to keep our website functioning correctly, safely and without disruption, but we are unable to provide an absolute guarantee in this respect. Using the website is always at your own risk. We are not liable for any damage caused by malfunctions, interruptions, harmful elements or defects of the website, whether these result from an external cause or from force majeure. We may, at any time and without notice, limit or suspend access to all or part of our website. As a rule, we only do so when circumstances warrant it.</P>

        <H3>Website content</H3>
        <P>We alone decide what information appears on the website. Advertisers can publish their own advertisements, including their own texts and photos (hereinafter the « Information »). Www.eliteescortseurope.eu does not guarantee that the Information on the website is complete, correct or useful. Naturally, we are not responsible for the texts and photos that advertisers publish on our website in this context, and we cannot be held liable for any actual or alleged violation of third-party rights. More details are available in our Advertising Conditions.</P>
        <P>Www.eliteescortseurope.eu may modify, add to or delete the content it provides on the website at any time. We cannot, however, vouch for the quality of the Information on our website, which may be incomplete, inaccurate or not useful. We therefore accept no liability for any direct or indirect damage that visitors suffer as a result of the Information made available on our website.</P>

        <H3>Your responsibilities as a visitor</H3>
        <P>Everyone who visits our website shares responsibility for how it is used. Visitors must at all times avoid any action that could harm the operation or security of the website or other visitors. It is, for instance, not allowed to use the website to bypass our business model or to gather information about other visitors on a large scale. Visitors accept that using automated systems or software to extract data from this website for commercial ends is forbidden.</P>
        <P>Our website may not be used to spread content that could harm other visitors, such as malicious software including computer viruses, malware, worms, trojans and cancelbots. The same ban applies to sending unsolicited and/or commercial messages through the website, such as junk mail, spam and chain letters.</P>
        <P>We reserve the right to take any legal or out-of-court action needed to obtain redress for ourselves and our visitors. A visitor whose actions or behaviour actually cause damage to the website or to other visitors is personally and fully responsible for it, and must hold www.eliteescortseurope.eu harmless against any claims for damages that result.</P>

        <H3>Links to third-party websites</H3>
        <P>Our website may contain links, hyperlinks or framed links to websites or other electronic platforms of third parties. Such a link does not in itself imply any connection between us and those websites, nor that we (tacitly) endorse their content. We have no control over these third-party websites and are not responsible for the security or proper working of the link or of the page it leads to. Once you click a link, you leave our website and can no longer hold us liable for any damage.</P>
        <P>Third-party websites may not provide the same guarantees as we do. We therefore recommend that anyone visiting a third-party website through our website carefully reads that website's general terms and conditions and privacy statement.</P>

        <H3>Intellectual property rights</H3>
        <P>All (intellectual property) rights to the website – including the rights to texts, video streams, images, design, data files, photos and other still or moving visual content, audio content, formats, software, trademarks (domain names included) and any other material – belong to www.eliteescortseurope.eu and/or its licensors. You may not make the website, or any part of it, available to third parties in any way, nor copy it, except by downloading and viewing it on one computer and/or printing one paper copy.</P>

        <H3>Miscellaneous</H3>
        <P>We are free to change, expand, restrict or stop our website and the services it offers at any time. We may do so without informing visitors in advance, and this does not entitle anyone to any compensation. This Disclaimer is governed by and construed solely under Belgian law. Any dispute concerning or arising from the use of the website, or from agreements entered into with www.eliteescortseurope.eu, will be brought before the courts of the place where our registered office is established, unless the law imposes another competent court. Should one or more of the provisions of this Disclaimer prove to be invalid or unenforceable, the remaining provisions will continue to apply in full. In that case, we may replace the provision concerned with a valid provision that has a comparable effect.</P>

        {/* Advertising Conditions */}
        <H2>Advertising Conditions</H2>

        <H3>Purpose</H3>
        <P>As an advertisement platform, www.eliteescortseurope.eu provides advertisers with advertising space on the website www.eliteescortseurope.eu, where they can publish advertisements – within the limits of the costs listed under « Costs » – for acte de présence, companionship and affection.</P>

        <H3>Rights and obligations of www.eliteescortseurope.eu</H3>
        <P>Www.eliteescortseurope.eu will do everything that can reasonably be expected to ensure that the platform works properly and remains available. The platform is provided « as is » and « as available », and www.eliteescortseurope.eu cannot offer any absolute guarantee in this regard.</P>

        <H3>Rights and obligations of the advertiser</H3>
        <P>Before an advertisement can go live on the platform, the advertiser must pay the full amount due for the chosen advertising period, as set out under « Costs ». The advertiser confirms that they are of legal age, that the information they provide is truthful and that they hold all necessary rights to the material they upload. The advertiser agrees to indemnify, defend and hold www.eliteescortseurope.eu harmless from any claims, damages, costs or expenses (including reasonable legal fees) brought by third parties in relation to this.</P>
        <P>The advertiser will not use the platform in any way that could be unlawful or harmful to www.eliteescortseurope.eu or to other users of the platform. The photos and texts of advertisers (“users”, “models”) shown on Elite Escorts Europe are supplied by users who are registered members of the Website. These users are responsible for the content of their advertisements, including all photos and text. Users may not upload fake pictures. If we find a profile with fake pictures, the entire account will be removed immediately and will not be refunded. Agencies and clubs must have at least 3 verified profiles before their account is activated. If we suspect an account is fraudulent, we may deactivate it at any time, without refund.</P>

        <H3>Prices</H3>
        <P>Www.eliteescortseurope.eu charges the following rates per advertisement:</P>
        <H4>Independent advertisers (per profile)</H4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-[#27272A]" data-testid="price-table-independent">
            <thead>
              <tr className="bg-[#DA4167]/15 text-[#F2F0ED]">
                <th className="text-left px-4 py-2 border border-[#27272A]">7 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">15 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">1 month</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">3 months</th>
              </tr>
            </thead>
            <tbody className="text-[#B8B8BE]">
              <tr>
                {['€ 30', '€ 50', '€ 90', '€ 240'].map((c, j) => (
                  <td key={j} className="px-4 py-2 border border-[#27272A]">{c}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <H4>Agencies (pp = per profile)</H4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-[#27272A]" data-testid="price-table-agency">
            <thead>
              <tr className="bg-[#DA4167]/15 text-[#F2F0ED]">
                <th className="text-left px-4 py-2 border border-[#27272A]">Profiles</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">7 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">15 days</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">1 month</th>
                <th className="text-left px-4 py-2 border border-[#27272A]">3 months</th>
              </tr>
            </thead>
            <tbody className="text-[#B8B8BE]">
              {[
                ['3 – 6', '€ 25 /pp', '€ 52 /pp', '€ 77 /pp', '€ 205 /pp'],
                ['7 – …', '€ 20 /pp', '€ 35 /pp', '€ 60 /pp', '€ 150 /pp'],
              ].map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => <td key={j} className="px-4 py-2 border border-[#27272A]">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H3>Refund policy</H3>
        <P>Your satisfaction matters to us, so we offer a clear refund policy. You can request a refund within 48 hours of your purchase. Refunds are granted if you give a valid reason showing that the purchase was fraudulent or unauthorized, or if we decide at our discretion that a refund is appropriate in your case. Contact us at info@eliteescortseurope.eu to initiate a refund.</P>

        <H3>Profile Verification</H3>
        <P>Verification is mandatory for all advertisers on Elite Escorts Europe. We require it for the safety of both our advertisers and our visitors, and to make sure every profile on the site belongs to a real person. Each advertiser's account includes a verification option. To complete verification, advertisers submit either a short verification video or a photo showing their face together with a valid ID. Our administrators review each submission. Once the required proof has been approved, the profile receives verified status and displays a green VERIFIED label. ID documents are used only for verification, are handled confidentially, and are never shown publicly.</P>
        <P>Please note: Verification confirms that a profile was created by a real person, but Elite Escorts Europe cannot and does not guarantee that the person shown in an advertisement's photos is the person who will attend an appointment arranged between you and an advertiser.</P>

        <H3>Liability</H3>
        <P>Insofar as the law allows, www.eliteescortseurope.eu is not liable for indirect or consequential damage. Unless mandatory law provides otherwise, www.eliteescortseurope.eu is only liable for damage resulting from a breach of its obligations if and to the extent that this damage is caused by intentional or gross negligence. Www.eliteescortseurope.eu is not liable for any other errors. The advertiser supplies the entire content of the advertisement on the platform. Www.eliteescortseurope.eu cannot be held liable for the content of the advertising space, but will handle all visual material discreetly. If www.eliteescortseurope.eu is nevertheless held liable, any compensation will be limited to the total amount the advertiser paid before the profile went live.</P>

        <H3>Intellectual property rights</H3>
        <P>Www.eliteescortseurope.eu owns the content of the platform, including texts, graphics, photos, images, video, sound, illustrations and software. This content is protected by copyright or other rights. The advertiser assigns its copyright in the texts and its image rights in the pictures to www.eliteescortseurope.eu. These rights remain with www.eliteescortseurope.eu after the advertising period has ended. The content of the platform may not be copied, published, reproduced or otherwise used without Www.eliteescortseurope.eu's written consent.</P>

        <H3>Terms</H3>
        <P>These Advertising Conditions apply throughout the advertising period that the advertiser selects when placing an advertisement.</P>

        <H3>Miscellaneous</H3>
        <P>Www.eliteescortseurope.eu is free to change, expand, transfer, restrict or stop the platform and the services it offers at any time. If this happens, Www.eliteescortseurope.eu will inform you. These Advertising Conditions, including the Privacy Policy, are governed by and construed solely under Belgian law. Any dispute arising from this agreement will be settled by or brought before the court of the place where our registered office is established, unless mandatory law provides otherwise.</P>
        <P>If you still have questions or remarks after reading these Advertising Conditions, you are always welcome to contact us at info@eliteescortseurope.eu.</P>

        {/* Privacy Policy */}
        <H2>Privacy Policy</H2>

        <H3>Purpose of this privacy statement</H3>
        <P>Anyone who visits the website (hereinafter the « visitor ») and anyone who uses our services, for example to place online advertisements (hereinafter the « advertiser »), will almost unavoidably share certain personal data. Personal data is information that makes it possible to identify you as a natural person, whether or not we actually do so. You are identifiable as soon as one or more pieces of personal data can be linked, directly or indirectly, to you as a natural person. Visitors and advertisers are hereinafter jointly referred to as « Data Subjects ».</P>
        <P>We use and process your personal data in line with the GDPR and other applicable legislation. In this Privacy Statement, « GDPR » refers to the Regulation of 27 April 2016 on the protection of natural persons with regard to the processing of personal data and on the free movement of such data (General Data Protection Regulation). This Privacy Statement explains to every Data Subject which processing activities Www.eliteescortseurope.eu may carry out with their personal data. Www.eliteescortseurope.eu may amend this Privacy Statement at any time. Data Subjects will be clearly informed of any significant change, and we advise them to check this document regularly.</P>

        <H3>Who processes your personal data?</H3>
        <H4>Data controller</H4>
        <P>Www.eliteescortseurope.eu decides, alone or together with others, which personal data are collected and for what purpose and by what means they are processed. Www.eliteescortseurope.eu is therefore a « controller » as defined in the GDPR. Www.eliteescortseurope.eu has put in place appropriate technical and organisational measures to protect the personal data of its visitors and customers. It uses a range of suitable security technologies and procedures to prevent unauthorised access to, use of or disclosure of your personal data, and makes sure that the personal data provided are stored securely in a controlled environment.</P>
        <H4>Data processor(s)</H4>
        <P>To process the personal data of visitors and customers, www.eliteescortseurope.eu works with carefully chosen « processors ». A processor is a natural or legal person who processes personal data on behalf of or at the request of the controller. The processor must safeguard the security and confidentiality of the personal data and always follows the controller's instructions.</P>
        <P>Www.eliteescortseurope.eu works with the following categories of « processors »: companies engaged for administrative, marketing, hosting, communication, analytics or payment purposes. To give the Data Subjects' personal data the best possible protection, www.eliteescortseurope.eu has made the necessary contractual agreements with these processors, so that they apply the same high standards as www.eliteescortseurope.eu does.</P>
        <P>Personal data may only be transferred to a processor outside the European Economic Area (EEA) if the recipient country has been recognised by the Belgian Data Protection Authority as offering an equally adequate level of protection or, failing that, if Www.eliteescortseurope.eu has concluded the necessary contractual agreements with that processor, based on the standard clauses imposed by the Belgian Data Protection Authority.</P>

        <H3>Legal basis for processing your personal data</H3>
        <P>In line with the GDPR, we process personal data on the following legal grounds:</P>
        <UL items={[
          'The performance of the agreement concluded with the customer, or steps taken at the Data Subject\'s request before entering into an agreement; or',
          'Compliance with legal or regulatory obligations related to managing the contractual relationship with the customer, invoicing in particular; or',
          'Our legitimate interest in answering information requests from visitors and customers; or',
          'Your explicit consent to receiving promotional offers (direct marketing) as a customer or visitor.',
        ]} />

        <H3>Which personal data do we process?</H3>
        <P>Www.eliteescortseurope.eu commits to collecting and processing only personal data that are relevant and necessary for the purposes for which they are processed. The amount and type of personal data www.eliteescortseurope.eu collects about you depend on how you use the website and/or our services. The more intensively you use our website and services, the more personal data www.eliteescortseurope.eu collects. Customers generally share more personal data than visitors.</P>
        <P>In concrete terms, we process the following categories of personal data:</P>
        <H4>Customers who place advertisements</H4>
        <UL items={[
          'Personal identification data (surname, first name, address, login credentials);',
          'Contact details (phone number and email address);',
          'Financial identification data (bank details);',
          '(Special categories of) personal data (gender, age, date and place of birth, nationality, photos, physical features);',
        ]} />
        <P>We collect these personal data when the customer places an advertisement on our website.</P>
        <H4>Visitors</H4>
        <UL items={[
          'Personal identification data (surname, first name, login credentials);',
          'Contact details (email address);',
          'Electronic identification data (cookies, IP address);',
        ]} />
        <P>We collect these personal data when you visit our website, and in particular when you complete and send our contact form or sign up for our newsletter.</P>

        <H3>Why do we use your personal data?</H3>
        <P>Processing your personal data is necessary for the website and the related services to work properly. The more intensively the Data Subject uses our website and services, the more personal data are collected. Processing only takes place for the following specific purposes:</P>
        <H4>Customers</H4>
        <UL items={['Customer management: customer administration, support and handling of complaints.']} />
        <H4>Visitors</H4>
        <UL items={[
          'Responding to information requests submitted through the website\'s contact form;',
          'Sending our newsletter.',
        ]} />
        <P>The Data Subject's personal data may also be used for the following purposes:</P>
        <UL items={['Handling disputes.', 'Preventing fraud and offences.']} />
        <P>We also use cookies to recognise visitors (or their IP address), to give them a personalised user experience, to remember their technical settings and to identify and fix errors on the website. You can find more information on how we use cookies in our Cookie Policy.</P>
        <P>When you visit the website, certain data are collected for statistical purposes. We need these data to improve the use of our website. They include the presumed location, time and date of the visit, the pages viewed, and so on. To protect your privacy as much as possible, these data are always anonymised.</P>
        <P>The Data Subject always provides the personal data to www.eliteescortseurope.eu personally and therefore retains a degree of control. Www.eliteescortseurope.eu may suspend or cancel certain operations if the necessary personal data are missing, incorrect or incomplete.</P>

        <H3>Who has access to your personal data?</H3>
        <P>Your personal data are processed for internal use within www.eliteescortseurope.eu only. They will not be sold, shared or disclosed to third parties unless you have explicitly consented to this, or the transfer is needed to perform the agreement or is required by law. We may share customers' personal data where needed to meet a legal obligation that applies to us, or to protect your vital interests or those of another natural person.</P>

        <H3>How long do we keep your personal data?</H3>
        <P>We keep your personal data for as long as needed to achieve the purposes described. They are deleted from our database once they are no longer needed for those purposes, or when the Data Subject validly exercises their right to have their personal data erased.</P>

        <H3>Your rights</H3>
        <H4>Lawful and secure processing of your personal data</H4>
        <P>Your personal data are always processed for legitimate purposes, as described in Article 5. They are collected and processed in an adequate, relevant and proportionate way, and are kept no longer than needed to achieve the intended purposes.</P>
        <H4>Right of access</H4>
        <P>Once you have proven your identity, you are entitled to receive information about how your personal data are processed. This includes the purposes of the processing, the categories of personal data concerned, the categories of recipients to whom they are disclosed, the criteria used to determine how long they are kept, and the rights you can exercise with regard to your personal data.</P>
        <H4>Right to rectification</H4>
        <P>Incorrect or incomplete data can be corrected. The User is primarily responsible for making the necessary changes in their « User Profile ». You may also ask us to make the changes for you.</P>
        <H4>Right to erasure</H4>
        <P>You are also entitled to have your personal data erased in the following situations:</P>
        <UL items={[
          'Your personal data are no longer needed for the purpose for which they were collected;',
          'You withdraw your consent to the processing and there is no other legal ground for it;',
          'You have validly objected to the processing of your personal data;',
          'Your personal data are being processed unlawfully;',
          'Your personal data must be erased to comply with a legal obligation.',
        ]} />
        <P>Erasure mainly concerns the visibility of personal data; erased data may still be stored temporarily.</P>
        <H4>Right to restriction of processing</H4>
        <P>In certain situations, you may ask for the processing of your personal data to be restricted. This applies in particular when the accuracy of the personal data is disputed, when the data are needed for legal proceedings, or for the time Www.eliteescortseurope.eu needs to verify whether you can validly exercise your right.</P>
        <H4>Right to object</H4>
        <P>You may object at any time to the processing of your personal data for « direct marketing », for profiling or for purposes based on the controller's legitimate interests. Www.eliteescortseurope.eu will then stop processing your personal data, unless it can show compelling legitimate grounds for the processing that override your right to object.</P>
        <H4>Right to data portability</H4>
        <P>You are entitled to receive the personal data you have provided to Www.eliteescortseurope.eu in a structured, commonly used and machine-readable format. You may also have these personal data transferred to another controller, unless this is not technically feasible.</P>
        <H4>Right to withdraw consent</H4>
        <P>You may withdraw your consent at any time, for instance consent you gave as a visitor to receive direct marketing.</P>

        <H3>How to exercise your rights</H3>
        <P>To exercise your rights, send a written request together with proof of your identity to Www.eliteescortseurope.eu by registered letter, or by email to info@eliteescortseurope.eu. We will respond as quickly as possible and no later than one (1) month after receiving your request.</P>

        <H3>Filing a complaint</H3>
        <P>If you have remarks or complaints about how we handle your personal data, please tell us first, so that we can try to find an amicable solution together. If you remain dissatisfied with how Www.eliteescortseurope.eu processes your personal data after contacting us, you may lodge a complaint with the competent supervisory authority (in Belgium: https://www.dataprotectionauthority.be).</P>

        {/* Cookie Policy */}
        <H2>Cookie Policy</H2>

        <H3>What are cookies?</H3>
        <P>When visitors arrive on our company's web pages, a small file called a “cookie” is saved on their device. Cookies can be used for various purposes. Some of the cookies we use are essential for the website to work properly (“process cookies”). Others collect information about how the website is used (statistics), so that we can make it easier and more useful. Some cookies are temporary and are deleted when you close your browser, while others stay on your device for a longer period.</P>

        <H3>Why we use cookies</H3>
        <P>To collect statistics that help us understand how visitors use our website and other online services, so that we can keep improving them.</P>

        <H3>Performance cookies</H3>
        <P>Performance cookies let us collect information about how visitors use our website – for example, which pages they view, how many pages they visit, where they click, how long each step takes and which error messages appear. We use this information to keep developing our website (its services, features, etc.) in line with what our visitors need, and to offer them a high-quality, user-friendly experience. To measure performance, our website uses third-party cookies on every visit. These cookies show us how many people visit the website and which content interests them. All information is stored anonymously, so that we can offer our users a high-quality experience.</P>
        <P>Our website uses analytics cookies from the following provider: Google Analytics – details about this service are available at: https://www.google.com/analytics/terms/us.html</P>

        <H3>Managing and disabling cookies</H3>
        <P>Modern browsers let you change your cookie settings. Many browsers accept cookies automatically by default, but you can change this setting so that cookies are no longer accepted automatically. If you reset your browser, it will let you choose again whether to accept cookies in the future.</P>

        <p className="text-[#71717A] text-xs mt-12">For any questions, contact us at info@eliteescortseurope.eu</p>
      </div>
      <SiteFooter />
    </div>
  );
}
