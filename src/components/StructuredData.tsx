'use client'

export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://tibiavote.com/#website",
        "url": "https://tibiavote.com",
        "name": "TibiaVote",
        "description": "Community-driven weapon proficiency builder and voting platform for Tibia MMORPG",
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://tibiavote.com/weapon/{search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ],
        "inLanguage": "en-US"
      },
      {
        "@type": "WebApplication",
        "@id": "https://tibiavote.com/#webapp",
        "url": "https://tibiavote.com",
        "name": "TibiaVote",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Web Browser",
        "description": "Build and vote for the best weapon proficiency combinations in Tibia. Community-driven weapon builds, perk rankings, and statistical analysis.",
        "author": {
          "@type": "Organization",
          "name": "TibiaVote Community"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "150",
          "bestRating": "5",
          "worstRating": "1"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://tibiavote.com/#organization",
        "name": "TibiaVote",
        "url": "https://tibiavote.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://tibiavote.com/logo.png",
          "width": 512,
          "height": 512
        },
        "sameAs": [
          "https://twitter.com/tibiavote",
          "https://discord.gg/tibiavote"
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://tibiavote.com/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://tibiavote.com"
          }
        ]
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}