# Modern Markdown Editor

A clean, lightweight, and intuitive WYSIWYG markdown editor with real-time preview and modern UI.

## Features

- Real-time markdown rendering
- Clean, modern interface
- Responsive design
- Simple integration
- Keyboard shortcuts for better workflow

## Installation

Include the script in your HTML:

```html
<script src="https://raw.githubusercontent.com/arazgholami/markdown-editor/main/wysiwyg-markdown-editor.js"></script>
```

## Basic Usage

```javascript
const editor = MarkdownEditor.init('your-element-id', {
    placeholder: 'Start writing in markdown...',
    autofocus: true
});
```

## Markdown Syntax

### Headers
```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

### Text Formatting
```markdown
**bold text**
*italic text*
__underline__
`inline code`
```

### Lists
```markdown
- Unordered item 1
- Unordered item 2
   - Nested item

1. Ordered item 1
2. Ordered item 2
   - [ ] Task 1
   - [x] Completed task
```

### Links & Media
```markdown
[Link text](https://example.com)
![Alt text](image.jpg)
```

### Blockquotes & Dividers
```markdown
> This is a blockquote

---
Horizontal rule
```

### Navigation
- `→` (Right arrow) to exit current tag
- `Backspace` at end to revert to markdown

## Options

| Option     | Type    | Default | Description                     |
|------------|---------|---------|---------------------------------|
| placeholder| string  | ''      | Placeholder text for empty editor |
| autofocus  | boolean | false   | Auto-focus the editor on load   |

## Browser Support

Modern browsers including:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Author

Created by [Araz Gholami](https://arazgholami.com)

## Support

If you find this project useful, consider supporting its development:

[!["Buy Me A Coffee"](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/arazgholami)

## Contact

- GitHub: [@arazgholami](https://github.com/arazgholami)
- Email: contact@arazgholami.com
