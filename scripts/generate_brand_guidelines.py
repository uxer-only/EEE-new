"""Generate the Only Elite Escorts brand guidelines PDF."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ------------------------------------------------------------------ config
OUT = "/app/frontend/public/only-elite-escorts-brand-guidelines.pdf"

# Palette
ROSE = HexColor("#DA4167")
WINE = HexColor("#832161")
DEEP_PURPLE = HexColor("#3D2645")
OFF_WHITE = HexColor("#F0EFF4")
BLACK = HexColor("#000000")
WHITE = HexColor("#FFFFFF")
LIGHT_GREY_BORDER = HexColor("#dbdadd")
MID_GREY = HexColor("#898989")
DARK_GREY_HDR = HexColor("#4B4B4B")
TABLE_HAIRLINE = HexColor("#e5e5e5")

styles = getSampleStyleSheet()

h1 = ParagraphStyle(
    "h1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=32, leading=38,
    textColor=WINE, spaceAfter=6,
)
h2 = ParagraphStyle(
    "h2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=18, leading=22,
    textColor=WINE, spaceBefore=18, spaceAfter=8,
)
h3 = ParagraphStyle(
    "h3", parent=styles["Heading3"],
    fontName="Helvetica-Bold", fontSize=12, leading=16,
    textColor=BLACK, spaceBefore=10, spaceAfter=4,
)
body = ParagraphStyle(
    "body", parent=styles["BodyText"],
    fontName="Helvetica", fontSize=10, leading=14, textColor=BLACK, spaceAfter=6,
)
muted = ParagraphStyle(
    "muted", parent=body, textColor=MID_GREY, fontSize=9,
)
brand_tag = ParagraphStyle(
    "brand_tag", parent=body, fontSize=11, leading=16,
    textColor=ROSE, alignment=0,
)


def swatch_row(hex_code, name, description):
    swatch = Table([[""]], colWidths=[22*mm], rowHeights=[16*mm])
    swatch.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), HexColor(hex_code)),
        ("BOX", (0, 0), (0, 0), 0.5, TABLE_HAIRLINE),
    ]))
    label = Paragraph(f"<b>{name}</b>", body)
    code = Paragraph(f"<font color='#898989'>{hex_code}</font>", body)
    desc = Paragraph(f"<font color='#898989' size='9'>{description}</font>", body)
    inner = Table([[label], [code], [desc]], colWidths=[110*mm])
    inner.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    row = Table([[swatch, inner]], colWidths=[26*mm, 130*mm])
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return row


def button_sample(label, fill_hex, text_hex, border_hex=None, page_bg_hex="#FFFFFF"):
    """Render a fake CTA button inside a table cell."""
    style = [
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TEXTCOLOR", (0, 0), (-1, -1), HexColor(text_hex)),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, -1), HexColor(fill_hex) if fill_hex != "transparent" else HexColor(page_bg_hex)),
    ]
    if border_hex:
        style.append(("BOX", (0, 0), (-1, -1), 0.8, HexColor(border_hex)))
    t = Table([[label]], colWidths=[60*mm], rowHeights=[12*mm])
    t.setStyle(TableStyle(style))
    return t


def build():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc = SimpleDocTemplate(
        OUT, pagesize=A4,
        leftMargin=22*mm, rightMargin=22*mm,
        topMargin=22*mm, bottomMargin=22*mm,
        title="Only Elite Escorts – Brand Guidelines",
        author="Only Elite Escorts",
    )

    story = []

    # ============ Cover ================================================
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph("Only Elite Escorts", h1))
    story.append(Paragraph('<font color="#DA4167">Brand Guidelines</font>', brand_tag))
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(
        'Tagline: <i>"Bringing your secret desire closer to you"</i>', body,
    ))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "This document describes the visual language of the platform: colours, typography, "
        "buttons, form fields, spacing and iconography. Use it as the single source of truth "
        "when designing any new surface, marketing collateral, or partner asset.",
        body,
    ))
    story.append(PageBreak())

    # ============ Colour palette =======================================
    story.append(Paragraph("1. Colour palette", h2))
    story.append(Paragraph(
        "The palette is anchored by rose (primary action), wine (headings & selection), "
        "and a light near-white surface. Neutral greys handle borders, labels and "
        "secondary text.", body,
    ))

    story.append(Paragraph("Brand primaries", h3))
    for hex_c, name, desc in [
        ("#DA4167", "Rose",           "Primary CTA fill · focus outline · pink accents"),
        ("#832161", "Wine",           "Section titles · dashboard-light secondary CTA · active selection"),
        ("#3D2645", "Deep Purple",    "Reserved for headline accents and future dark accents"),
    ]:
        story.append(swatch_row(hex_c, name, desc))

    story.append(Paragraph("Neutrals", h3))
    for hex_c, name, desc in [
        ("#FFFFFF", "White",              "Card & light-form backgrounds"),
        ("#F0EFF4", "Off-white",          "Light page background"),
        ("#0A0A0C", "Near-black",         "Dark page background (Landing, Login, Register)"),
        ("#141416", "Panel dark",         "Original dark card surface"),
        ("#000000", "Black",              "Body text on light pages"),
        ("#dbdadd", "Light grey",         "Card borders and dividers on light pages"),
        ("#898989", "Mid grey",           "Field labels · unselected chip text on light pages"),
        ("#52525B", "Dark grey",          "Input borders on dark pages"),
        ("#4B4B4B", "Table header grey",  "Services table header background"),
        ("#9CA3AF", "Placeholder grey",   "Placeholder text inside inputs"),
    ]:
        story.append(swatch_row(hex_c, name, desc))

    story.append(PageBreak())

    # ============ Typography ==========================================
    story.append(Paragraph("2. Typography", h2))
    story.append(Paragraph(
        "The product uses <b>Playfair Display</b> for elegant serif display headings "
        "(logo, hero title) and <b>Inter</b> for all UI copy. Fall back to the system UI "
        "stack for print / PDF exports.", body,
    ))

    story.append(Paragraph("Type scale (Tailwind classes)", h3))
    type_scale = [
        ["Token",  "Class",             "Usage"],
        ["H1",      "text-4xl / sm:text-5xl / lg:text-6xl", "Hero, page headline"],
        ["H2",      "text-2xl",         "Section titles inside forms & cards"],
        ["H3",      "text-lg / text-xl","Card / block sub-title"],
        ["Body",    "text-base (mobile: text-sm)", "Standard paragraph copy"],
        ["Small",   "text-sm",          "Field labels, secondary info"],
        ["Micro",   "text-xs",          "Helper text · counters · badges"],
        ["Tracking","tracking-[0.2em]", "Uppercase eyebrows and CTA labels"],
    ]
    tbl = Table(type_scale, colWidths=[22*mm, 58*mm, 82*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREY_HDR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOX", (0, 0), (-1, -1), 0.4, LIGHT_GREY_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, LIGHT_GREY_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)

    story.append(PageBreak())

    # ============ Buttons =============================================
    story.append(Paragraph("3. Buttons", h2))
    story.append(Paragraph(
        "The platform uses two button hierarchies: <b>Primary</b> (solid rose) and "
        "<b>Secondary</b> (outline). Secondary buttons adapt to page background — white "
        "outline on dark pages, wine outline inside the light Provider Dashboard.", body,
    ))

    story.append(Paragraph("Primary CTA · used everywhere", h3))
    story.append(button_sample("SIGN IN", "#DA4167", "#FFFFFF"))
    story.append(Paragraph("Fill <b>#DA4167</b> · Label <b>#FFFFFF</b> · Hover fill <b>#c33658</b> · Height 50px · Uppercase, tracking 0.2em", muted))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Secondary CTA · dark pages", h3))
    dark_wrap = Table([[button_sample("ADVERTISE HERE", "transparent", "#FFFFFF", border_hex="#FFFFFF", page_bg_hex="#0A0A0C")]],
                      colWidths=[80*mm])
    dark_wrap.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0A0A0C")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(dark_wrap)
    story.append(Paragraph("Fill transparent · Outline <b>#FFFFFF</b> · Label <b>#FFFFFF</b> · Hover bg <b>rgba(255,255,255,0.10)</b>", muted))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Secondary CTA · light dashboard (.dashboard-light scope)", h3))
    story.append(button_sample("SAVE CHANGES", "transparent", "#832161", border_hex="#832161"))
    story.append(Paragraph("Fill transparent · Outline <b>#832161</b> · Label <b>#832161</b> · Hover bg <b>rgba(131,33,97,0.10)</b>", muted))
    story.append(Spacer(1, 6*mm))

    story.append(PageBreak())

    # ============ Forms ==============================================
    story.append(Paragraph("4. Form fields", h2))
    story.append(Paragraph(
        "All forms across the app follow one spacing and colour system, whether they sit "
        "on a dark or light surface.", body,
    ))

    story.append(Paragraph("Field colours", h3))
    field_tbl_data = [
        ["Element", "Value", "Hex"],
        ["Field outline · default",           "grey",                 "#898989"],
        ["Field outline · focus / active",    "pink",                 "#DA4167"],
        ["Field label",                       "grey",                 "#898989"],
        ["Field text (typed value)",          "black",                "#000000"],
        ["Field placeholder",                 "tailwind grey-400",    "#9CA3AF"],
        ["Helper / error text",               "pink",                 "#DA4167"],
        ["Selection button · unselected",     "outline+text grey",    "#898989"],
        ["Selection button · selected",       "outline+text wine",    "#832161"],
        ["Selection button · hover",          "outline wine",         "#832161"],
    ]
    ftbl = Table(field_tbl_data, colWidths=[70*mm, 46*mm, 46*mm])
    ftbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREY_HDR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOX", (0, 0), (-1, -1), 0.4, LIGHT_GREY_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, LIGHT_GREY_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ftbl)

    story.append(Paragraph("Form spacing rules", h3))
    spacing_tbl = [
        ["Pair",                              "Value",  "Tailwind"],
        ["Padding between label and field",   "4 px",   "mb-1"],
        ["Padding between helper text and field", "4 px", "mt-1"],
        ["Padding between fields",            "16 px",  "flex flex-col gap-4"],
    ]
    stbl = Table(spacing_tbl, colWidths=[80*mm, 30*mm, 52*mm])
    stbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREY_HDR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOX", (0, 0), (-1, -1), 0.4, LIGHT_GREY_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, LIGHT_GREY_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(stbl)

    story.append(Paragraph("Checkboxes", h3))
    story.append(Paragraph(
        "Every <b>&lt;input type='checkbox'&gt;</b> uses a transparent background "
        "(inheriting the page/surface behind it) with a matching neutral grey border "
        "(<b>#898989</b> in the .dashboard-light scope, <b>#52525B</b> on dark pages). "
        "When checked, the box fills with <b>#DA4167</b> and shows a white check mark. "
        "Focus adds a soft rose ring (<b>rgba(218,65,103,0.25)</b>).", body,
    ))

    story.append(PageBreak())

    # ============ Cards & surfaces =====================================
    story.append(Paragraph("5. Cards & surfaces", h2))
    story.append(Paragraph(
        "Cards use two surface styles, applied automatically via the <b>.dashboard-light</b> "
        "scope on the Provider Dashboard.", body,
    ))
    story.append(Paragraph("Card · dark page (base)", h3))
    story.append(Paragraph("<b>bg-[#141416]</b> · <b>border-[#27272A]</b> · hover border <b>#832161</b>", muted))
    story.append(Paragraph("Card · .dashboard-light (light dashboard)", h3))
    story.append(Paragraph("<b>bg-[#FFFFFF]</b> · <b>border-[#dbdadd]</b> · hover border <b>#832161</b>", muted))

    story.append(Paragraph("6. Iconography", h2))
    story.append(Paragraph(
        "Icons are pulled from <b>phosphor-react</b> and Font Awesome CDN. Weights <i>bold</i> "
        "or <i>fill</i> are preferred for CTAs. Do not use emoji glyphs for UI icons.", body,
    ))

    story.append(Paragraph("7. Tone of voice", h2))
    story.append(Paragraph(
        "Premium · discreet · elegant · trustworthy. Copy is concise, in Title Case for CTAs "
        "and sentence case for body. Avoid slang; favour the words <i>elegant, refined, verified, "
        "discreet, exclusive</i>. Tagline for hero placements:", body,
    ))
    story.append(Paragraph('<i>"Bringing your secret desire closer to you"</i>', brand_tag))

    story.append(Paragraph("8. Motion", h2))
    story.append(Paragraph(
        "Prefer 200–300ms cubic-bezier transitions on colour, transform and shadow. Never "
        "animate <b>all</b> (breaks transforms). Micro-animations to keep: arrow slide on CTA hover, "
        "star rotate on advertise CTA, hover-lift on provider cards.", body,
    ))

    doc.build(story)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
