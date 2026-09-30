// Generic, ATS-safe, single-column resume. The merged JSON document is passed on the CLI as
// `--input data=<path to resume.json>` and read here. No columns, tables, icons or graphics.
#let data = json(sys.inputs.data)

#set page(paper: "a4", margin: (x: 1.5cm, y: 1.3cm))
#set text(size: 10pt, hyphenate: false)
#set par(justify: false, leading: 0.62em, spacing: 0.7em)
#set list(tight: true, indent: 1.1em, body-indent: 0.4em, spacing: 0.22em, marker: ([-],))

#let field(obj, key) = obj.at(key, default: none)

// Non-empty values for the listed keys, in order.
#let present(obj, keys) = (
  keys
    .map(key => obj.at(key, default: none))
    .filter(value => value != none and str(value) != "")
)

#let basics = data.at("basics", default: ())

#let name = field(basics, "name")
#if name != none [
  #align(center)[#text(size: 15pt, weight: "bold")[#name]]
]

#let contact = present(basics, ("location", "phone", "email", "linkedin", "github"))
#if contact.len() > 0 [
  #align(center)[#text(size: 9pt)[#contact.join(" | ")]]
]

#let summary = field(data, "summary")
#if summary != none and summary != "" [
  #v(0.35em)
  #summary
]

#for section in data.at("sections", default: ()) [
  #let items = section.at("items", default: ())
  #if items.len() > 0 [
    #v(0.55em)
    #text(size: 11pt, weight: "bold")[#upper(section.at("type", default: ""))]
    #v(0.15em)
    #for item in items [
      #let headerLine = {
        let primary = present(item, ("title", "name", "credential")).at(0, default: none)
        let org = present(item, ("org", "institution")).at(0, default: none)
        let start = field(item, "start")
        let end = field(item, "end")
        // En dash (U+2013) between start and end, matching "MMM YYYY – MMM YYYY". Never an em dash.
        let dates = if start != none and end != none { start + " – " + end }
          else if start != none { start }
          else if end != none { end }
          else { none }
        let head = if primary != none and org != none { primary + ", " + org }
          else if primary != none { primary }
          else if org != none { org }
          else { none }
        if head != none and dates != none { head + " (" + dates + ")" }
          else if head != none { head }
          else if dates != none { dates }
          else { "" }
      }
      #if headerLine != "" [
        #text(weight: "bold")[#headerLine]
      ]

      #let tech = item.at("tech", default: ())
      #if tech.len() > 0 [
        #linebreak()
        #text(style: "italic", size: 9pt)[#tech.join(", ")]
      ]

      #let contextText = field(item, "context")
      #if contextText != none and contextText != "" [
        #linebreak()
        #text(style: "italic")[#contextText]
      ]

      #let itemText = field(item, "text")
      #if itemText != none and itemText != "" [
        #linebreak()
        #itemText
      ]

      #let bulletTexts = (
        item.at("bullets", default: ())
          .map(bullet => bullet.at("text", default: ""))
          .filter(entry => entry != "")
      )
      #if bulletTexts.len() > 0 [
        #list(..bulletTexts)
      ]
    ]
  ]
]

#let skills = data.at("skills", default: ())
#if skills.len() > 0 [
  #v(0.55em)
  #text(size: 11pt, weight: "bold")[SKILLS]
  #v(0.15em)
  #skills.join(", ")
]
