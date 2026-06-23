import type { Metadata } from "next";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { Notice } from "@/components/ui/Notice";
import { PageIntro } from "@/components/ui/PageIntro";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import {
  getPublicSettings,
  hasPublicContactEmail,
  isPublicUrl,
} from "@/lib/settings/publicSettings";
import uiStyles from "@/components/ui/UI.module.css";

// owner が業務設定（連絡先・SNS）を更新したら反映されるよう、ビルド時固定ではなく都度読取にする。
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/contact",
    title: dictionary.pages.contact.title,
    description: dictionary.pages.contact.description,
  });
}

export default async function ContactPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  const settings = await getPublicSettings();
  const email = hasPublicContactEmail(settings.contactEmail) ? settings.contactEmail : "";
  const threads = isPublicUrl(settings.socialThreads) ? settings.socialThreads : "";
  const instagram = isPublicUrl(settings.socialInstagram) ? settings.socialInstagram : "";
  const hasContactInfo = Boolean(email || threads || instagram);

  return (
    <>
      <PageIntro
        description={dictionary.pages.contact.description}
        kicker={dictionary.nav.contact}
        title={dictionary.pages.contact.title}
      />
      {threads ? (
        <section className="page-section compact">
          <div className="content-shell" style={{ display: "grid", gap: "12px" }}>
            <h2>{dictionary.contactInfo.dmHeading}</h2>
            <p>{dictionary.contactInfo.dmLead}</p>
            <a
              className={`${uiStyles.button} ${uiStyles.primary}`}
              href={threads}
              rel="noopener noreferrer"
              style={{ justifySelf: "start" }}
              target="_blank"
            >
              {dictionary.contactInfo.dmButton}
            </a>
          </div>
        </section>
      ) : null}
      {/* 下記フォームはデモ（送信内容は保存されません）。実際のご相談・ご注文は上の Threads DM へ。 */}
      <section className="page-section compact">
        <div className="content-shell two-column">
          <Notice>{dictionary.common.demoNotice}</Notice>
          <InquiryForm dictionary={dictionary} mode="contact" />
        </div>
      </section>
      <section className="page-section compact">
        <div className="content-shell">
          <h2>{dictionary.contactInfo.heading}</h2>
          {hasContactInfo ? (
            <dl className="contact-details">
              {email ? (
                <div>
                  <dt>{dictionary.contactInfo.emailLabel}</dt>
                  <dd>
                    <a href={`mailto:${email}`}>{email}</a>
                  </dd>
                </div>
              ) : null}
              {threads || instagram ? (
                <div>
                  <dt>{dictionary.contactInfo.followLabel}</dt>
                  <dd>
                    {threads ? (
                      <a href={threads} rel="me noopener noreferrer" target="_blank">
                        Threads
                      </a>
                    ) : null}
                    {threads && instagram ? " · " : null}
                    {instagram ? (
                      <a href={instagram} rel="me noopener noreferrer" target="_blank">
                        Instagram
                      </a>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="muted">{dictionary.contactInfo.pending}</p>
          )}
        </div>
      </section>
    </>
  );
}
