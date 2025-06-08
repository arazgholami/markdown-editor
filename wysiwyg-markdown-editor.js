// wysiwyg-markdown-editor.js
const { marked } = require('marked');
const TurndownService = require('turndown');

/**
 * @class MarkdownEditor
 * @description A WYSIWYG Markdown editor class.
 */
class MarkdownEditor {
  /**
   * @constructor
   * @param {string} editorId - The ID of the HTML element to be used as the editor.
   * @param {object} [options={}] - Configuration options for the editor.
   */
  constructor(editorId, options = {}) {
    this.editorElement = document.getElementById(editorId);
    this.options = options;

    if (!this.editorElement) {
      throw new Error(`Editor element with ID "${editorId}" not found.`);
    }

    // Set contenteditable attributes
    this.editorElement.setAttribute('contenteditable', 'true');
    this.editorElement.setAttribute('spellcheck', 'false');
    this.editorElement.setAttribute('dir', 'auto');

    // Initialize editor content if it's empty
    if (!this.editorElement.innerHTML.trim()) {
      this.editorElement.innerHTML = '<p dir="auto"><br></p>';
    }

    this._configureMarked();
    this._initTurndown();
    this._initEventListeners();
  }

  /**
   * @private
   * @method _initTurndown
   * @description Initializes the TurndownService with options.
   */
  _initTurndown() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx', // or 'setext'
      hr: '---',
      bulletListMarker: '*', // or '-' or '+'
      codeBlockStyle: 'fenced', // or 'indented'
      fence: '```', // or '~~~'
      emDelimiter: '*', // or '_'
      strongDelimiter: '**', // or '__'
      linkStyle: 'inlined', // or 'referenced'
      linkReferenceStyle: 'full', // or 'collapsed' or 'shortcut'
      // Add a rule to keep <br> tags for intentional line breaks if desired,
      // otherwise Turndown might strip them or convert them to newlines
      // depending on other rules.
      // keepReplacement: (content, node) => node.isSelfClosing && node.tagName === 'BR'
    });

    // Add a rule to ignore dir="auto" attributes to prevent them from appearing in Markdown
    this.turndownService.addRule('ignoreDirAuto', {
      filter: (node) => node.hasAttribute('dir'),
      replacement: (content, node) => {
        // If it's a block element we want to keep, just return its content.
        // Turndown will handle the block conversion (e.g. p, div, etc.)
        // For inline elements, just return content.
        return node.isBlock ? content : content;
        // A more robust way might be to remove the attribute before processing
        // but this can be tricky with Turndown's internal workings.
        // This simple rule just ensures `dir` doesn't become part of the text.
      }
    });
    
    // Example: Customize paragraph handling if needed
    // this.turndownService.addRule('paragraph', {
    //   filter: 'p',
    //   replacement: function (content, node) {
    //     // If paragraph has dir="auto", we want to ensure it's preserved by marked later
    //     // However, turndown should just convert its content.
    //     // The dir="auto" is added by marked's renderer.
    //     return '\n\n' + content + '\n\n';
    //   }
    // });
  }

  /**
   * @private
   * @method _configureMarked
   * @description Configures the marked library with custom renderer.
   */
  _configureMarked() {
    const renderer = new marked.Renderer();
    const defaultHeading = renderer.heading.bind(renderer);
    const defaultParagraph = renderer.paragraph.bind(renderer);
    const defaultList = renderer.list.bind(renderer);
    const defaultBlockquote = renderer.blockquote.bind(renderer);
    // Potentially more elements: code, html, hr, listitem, table, tablecell, tablerow

    renderer.heading = (text, level, raw, slugger) => {
      const heading = defaultHeading(text, level, raw, slugger);
      return heading.replace(/^(<h[1-6])/, `$1 dir="auto"`);
    };

    renderer.paragraph = (text) => {
      const paragraph = defaultParagraph(text);
      return paragraph.replace(/^(<p)/, `$1 dir="auto"`);
    };

    renderer.list = (body, ordered, start) => {
      const list = defaultList(body, ordered, start);
      const tag = ordered ? 'ol' : 'ul';
      return list.replace(new RegExp(`^(<${tag})`), `$1 dir="auto"`);
    };
    
    renderer.blockquote = (quote) => {
        const blockquote = defaultBlockquote(quote);
        return blockquote.replace(/^(<blockquote)/, `$1 dir="auto"`);
    };

    marked.setOptions({
      renderer: renderer,
      gfm: true, // Use GitHub Flavored Markdown
      breaks: false, // Do not convert single newlines to <br>. Enter key should create new paragraphs.
      pedantic: false,
      sanitize: false, // Important: Don't sanitize HTML, as we are generating it.
      smartypants: false,
    });
  }

  /**
   * @static
   * @method init
   * @description Creates and initializes a new MarkdownEditor instance.
   * @param {string} editorId - The ID of the HTML element for the editor.
   * @param {object} [options={}] - Configuration options.
   * @returns {MarkdownEditor} A new instance of MarkdownEditor.
   */
  static init(editorId, options = {}) {
    return new MarkdownEditor(editorId, options);
  }

  /**
   * @private
   * @method _initEventListeners
   * @description Initializes event listeners for the editor.
   */
  _initEventListeners() {
    this.editorElement.addEventListener('input', this._handleInput.bind(this));
    this.editorElement.addEventListener('keydown', this._handleKeydown.bind(this));
  }

  /**
   * @private
   * @method _handleInput
   * @description Handles the input event on the editor.
   *              Converts Markdown to HTML and updates the editor content.
   * @param {Event} event - The input event object.
   */
  _handleInput(event) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let currentElement = range.commonAncestorContainer;

    // If the current element is a text node, get its parent.
    if (currentElement.nodeType === Node.TEXT_NODE) {
      currentElement = currentElement.parentNode;
    }

    // Traverse up to find the block-level element (e.g., P, H1, LI) or the editor itself.
    while (currentElement && currentElement !== this.editorElement &&
           !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(currentElement.tagName)) {
      currentElement = currentElement.parentNode;
    }

    // If no suitable block element is found, or we are at the root, do nothing for now.
    // This edge case might need more sophisticated handling for full editor experience.
    if (!currentElement || currentElement === this.editorElement) {
      // Fallback: if editor is empty, ensure it has a default paragraph.
      if (!this.editorElement.innerHTML.trim()) {
        this.editorElement.innerHTML = '<p dir="auto"><br></p>';
        this._setCursor(this.editorElement.firstChild, 0);
      }
      return;
    }

    const markdownText = this._getTextContentFromNode(currentElement);

    // Basic check for Markdown patterns that should trigger block conversion
    // This is a simplification. Real-world scenarios are more complex.
    const blockPatterns = /^(#{1,6}\s|\*\s|-\s|\d+\.\s|> )/;
    if (!blockPatterns.test(markdownText) && currentElement.tagName === 'P' && !currentElement.previousSibling && !currentElement.nextSibling && this.editorElement.children.length ===1 ) {
        // If it's just plain text in a single paragraph, don't process with marked yet,
        // unless it's the only paragraph and it becomes empty.
         if (!markdownText.trim() && !event.inputType.startsWith('delete')) {
            // If paragraph becomes empty (but not due to deletion), reset to default
            currentElement.innerHTML = '<br>';
            this._setCursor(currentElement, 0);
            return;
        }
        // Otherwise, let browser handle simple text input in existing <p>
        return;
    }


    // Preserve cursor position relative to the text content of the current element.
    const preConversionRange = selection.getRangeAt(0).cloneRange();
    const preConversionText = currentElement.textContent || "";
    let cursorOffset = 0;
    try {
        // Calculate offset carefully: iterate through text nodes up to the cursor focus node
        let tempRange = document.createRange();
        tempRange.selectNodeContents(currentElement);
        tempRange.setEnd(preConversionRange.focusNode, preConversionRange.focusOffset);
        cursorOffset = tempRange.toString().length;
    } catch (e) {
        console.warn("Could not calculate cursor offset precisely:", e);
        // Fallback if precise calculation fails
        cursorOffset = preConversionRange.startOffset;
    }


    // Convert the Markdown text of the current element to HTML.
    // For blockquotes, we need to make sure the `>` is removed before sending to marked.
    let processedMarkdownText = markdownText;
    if (currentElement.tagName === 'BLOCKQUOTE' || markdownText.startsWith('> ')) {
        processedMarkdownText = markdownText.replace(/^>\s*/, '');
    }
    
    const html = marked(processedMarkdownText.trim()).trim();


    if (currentElement.innerHTML === html) {
        // If generated HTML is same as current, no need to update.
        // This can happen if typing regular text into an already correctly formatted element.
        return;
    }
    
    // Replace the content of the current element with the rendered HTML.
    // Avoid replacing if the new HTML is empty and the original wasn't just a <br>
    if (html || currentElement.innerHTML === '<br>' || currentElement.innerHTML === '<br/>') {
        const parent = currentElement.parentNode;
        // Marked might return multiple blocks (e.g. if list is created from single line)
        // or just a text node if the markdown resolves to plain text.
        // We need to insert the new node(s) and remove the old one.
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html || '<p dir="auto"><br></p>'; // Ensure there's always a paragraph

        // If the original element was the only child of the editor,
        // and marked produced a different block type, replace directly.
        // Otherwise, try to insert intelligently.
        
        const newNodes = Array.from(tempDiv.childNodes);
        let nodeToFocus = newNodes[newNodes.length - 1]; // Default to last new node

        if (newNodes.length > 0) {
            // Insert new nodes before the current element's next sibling, or at the end of parent
            const nextSibling = currentElement.nextSibling;
            newNodes.forEach(node => {
                parent.insertBefore(node, nextSibling);
            });
            parent.removeChild(currentElement);

            // Attempt to set cursor in the last of the new nodes.
            // This is a simplification; ideal cursor placement is complex.
            if (nodeToFocus) {
                if (nodeToFocus.nodeType === Node.TEXT_NODE) {
                     this._setCursor(nodeToFocus, nodeToFocus.textContent.length);
                } else if (nodeToFocus.firstChild) {
                    // Try to place cursor more intelligently based on pre-conversion offset
                    let newTextContent = nodeToFocus.textContent || "";
                    let newOffset = Math.min(cursorOffset, newTextContent.length);

                    // Find the actual text node and offset
                    let focusNode = nodeToFocus.firstChild;
                    let accumulatedLength = 0;
                    while(focusNode){
                        if(focusNode.nodeType === Node.TEXT_NODE){
                            if(accumulatedLength + focusNode.textContent.length >= newOffset){
                                this._setCursor(focusNode, newOffset - accumulatedLength);
                                break;
                            }
                            accumulatedLength += focusNode.textContent.length;
                        } else if (focusNode.firstChild) { // Descend into element nodes
                            focusNode = focusNode.firstChild;
                            continue;
                        }
                        // Move to next sibling or parent's next sibling
                        if(focusNode.nextSibling){
                            focusNode = focusNode.nextSibling;
                        } else {
                            focusNode = focusNode.parentNode.nextSibling; // This might be too simplistic
                        }
                    }
                     if (!focusNode) this._setCursorInElement(nodeToFocus, newOffset);

                } else {
                     this._setCursorInElement(nodeToFocus, 0); // Fallback for empty elements
                }
            }
        } else if (!this.editorElement.innerHTML.trim()) {
            // If everything was cleared, restore default paragraph
            this.editorElement.innerHTML = '<p dir="auto"><br></p>';
            this._setCursor(this.editorElement.firstChild, 0);
        }

    } else if (!this.editorElement.innerHTML.trim()) { // If html is empty and currentElement was not just <br>
        this.editorElement.innerHTML = '<p dir="auto"><br></p>';
        this._setCursor(this.editorElement.firstChild, 0);
    }
  }

  /**
   * @private
   * @method _getTextContentFromNode
   * @description Retrieves the text content from a node, attempting to reconstruct Markdown.
   * @param {Node} node - The HTML node.
   * @returns {string} The text content.
   */
  _getTextContentFromNode(node) {
    if (!node) return '';
    // For now, a simple textContent. This will need to be more sophisticated
    // to correctly convert HTML back to Markdown for accurate re-rendering,
    // especially for inline elements or complex structures.
    return node.textContent || '';
  }

  /**
   * @private
   * @method _setCursor
   * @description Sets the cursor position within a given node.
   * @param {Node} node - The node to set the cursor in.
   * @param {number} offset - The offset within the node.
   */
  _setCursor(node, offset) {
    if (!node) return;
    try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(node, offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } catch (e) {
        console.warn("Error setting cursor:", e, "Node:", node, "Offset:", offset);
        // Fallback: try to focus the editor element itself if setting cursor fails
        this.editorElement.focus();
    }
  }

  /**
   * @private
   * @method _setCursorInElement
   * @description Sets the cursor at a specific offset within an element, finding a suitable text node.
   * @param {Node} element - The element to set the cursor in.
   * @param {number} offset - The desired offset.
   */
  _setCursorInElement(element, offset) {
    let node = element.firstChild;
    let currentOffset = 0;
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = node.textContent.length;
            if (currentOffset + nodeLength >= offset) {
                this._setCursor(node, offset - currentOffset);
                return;
            }
            currentOffset += nodeLength;
        } else if (node.firstChild) { // Element node, try to go deeper
            // This recursive call is a simplification and might not always be correct.
            // A proper solution would involve iterating through all text nodes.
            // For now, we'll just try the first child or place at end of current element.
             if (this._setCursorInElementRecursive(node, offset - currentOffset)) return;
        }
        node = node.nextSibling;
    }
    // Fallback: if offset is out of bounds or no suitable text node found, place cursor at the end of the element
    this._setCursor(element, element.childNodes.length > 0 ? element.childNodes.length : 0);
     // A better fallback might be to find the last text node and place cursor at its end.
    let lastTextNode = null;
    let child = element.lastChild;
    while(child){
        if(child.nodeType === Node.TEXT_NODE){
            lastTextNode = child;
            break;
        }
        if(child.lastChild) child = child.lastChild; // check deeper
        else child = child.previousSibling;
    }
    if(lastTextNode) this._setCursor(lastTextNode, lastTextNode.textContent.length);
    else if (element.firstChild) this._setCursor(element.firstChild, 0); // if no textnode, try first child
    else this._setCursor(element,0); // if no children, set cursor in element itself.
  }

  _setCursorInElementRecursive(element, offset) {
    let node = element.firstChild;
    let currentOffset = 0;
    while(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = node.textContent.length;
            if (currentOffset + nodeLength >= offset) {
                this._setCursor(node, offset - currentOffset);
                return true;
            }
            currentOffset += nodeLength;
        } else if (node.firstChild) {
            if (this._setCursorInElementRecursive(node, offset - currentOffset)) return true;
            // If not found in child, update currentOffset by child's text length
            currentOffset += node.textContent.length;
        }
        node = node.nextSibling;
    }
    return false;
  }


  /**
   * @private
   * @method _handleKeydown
   * @description Handles the keydown event on the editor, specifically for "Enter".
   * @param {KeyboardEvent} event - The keydown event object.
   */
  _handleKeydown(event) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (event.key === 'Enter') {
      event.preventDefault();
      document.execCommand('insertParagraph'); // execCommand is simpler for Enter key
      // Ensure the new paragraph respects the editor's directionality and has dir="auto"
      let newPara = range.startContainer;
      if (newPara.nodeType === Node.TEXT_NODE) newPara = newPara.parentNode;
      // After insertParagraph, the cursor might be in the old paragraph or a new one.
      // We need to find the current block element the cursor is in.
      let blockElement = newPara;
      while(blockElement && blockElement !== this.editorElement && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(blockElement.tagName)){
          blockElement = blockElement.parentNode;
      }
      if(blockElement && blockElement !== this.editorElement && blockElement.tagName === 'P'){
          blockElement.setAttribute('dir', 'auto');
          // If the new paragraph is empty, execCommand often inserts <br>
          // Ensure it's <p dir="auto"><br></p> for consistency if it became empty
          if(!blockElement.innerHTML.trim()){
              blockElement.innerHTML = '<br>';
          }
      } else if (blockElement && blockElement === this.editorElement && this.editorElement.lastChild && this.editorElement.lastChild.nodeType === Node.ELEMENT_NODE && this.editorElement.lastChild.tagName === 'P') {
          // If cursor landed directly in editor and last element is a P, set its dir
          this.editorElement.lastChild.setAttribute('dir', 'auto');
           if(!this.editorElement.lastChild.innerHTML.trim()){
              this.editorElement.lastChild.innerHTML = '<br>';
          }
      }
      return; // Return after handling enter.
    }

    if (event.key === 'Backspace') {
      let currentElement = range.commonAncestorContainer;
      if (currentElement.nodeType === Node.TEXT_NODE) {
        currentElement = currentElement.parentNode;
      }

      // Check if cursor is at the beginning of the element (or editor for safety)
      // And the element is not the editor itself and not a standard paragraph <p><br></p>
      if (range.startOffset === 0 && currentElement !== this.editorElement) {
        // More specific check: is the cursor at the very beginning of the text content of this element?
        let atStartOfElement = false;
        if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
            // Check if there are no previous sibling text nodes within this element
            let prevNode = range.startContainer.previousSibling;
            while(prevNode && prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent.length === 0){
                prevNode = prevNode.previousSibling; // Skip empty text nodes
            }
            if(!prevNode || prevNode.nodeType !== Node.TEXT_NODE){ // No non-empty previous text node
                 // Also check if inside a specific element type we want to convert
                if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'].includes(currentElement.tagName) ||
                    (currentElement.tagName === 'P' && currentElement.innerHTML !== '<br>')) { // Don't convert empty P on backspace
                    atStartOfElement = true;
                }
            }
        } else if (range.startContainer === currentElement && range.startOffset === 0){
             // Cursor is at the beginning of the element itself (e.g. before any child nodes)
             if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'].includes(currentElement.tagName)||
                 (currentElement.tagName === 'P' && currentElement.innerHTML !== '<br>')) {
                atStartOfElement = true;
            }
        }


        if (atStartOfElement && currentElement.tagName !== 'BODY' && currentElement.parentNode !== this.editorElement.ownerDocument.body) {
          // Prevent default backspace action to avoid merging with previous element incorrectly
          event.preventDefault();

          const elementToConvert = currentElement;
          const markdownText = this._convertToMarkdown(elementToConvert.outerHTML);

          // Replace the HTML element with its Markdown text equivalent
          // The replacement should happen as a new paragraph or plain text within the editor.
          const textNode = document.createTextNode(markdownText);

          // If the element to convert is the first child of the editor or if its parent is the editor
          if (elementToConvert.parentNode === this.editorElement) {
            // Create a new paragraph to hold the text
            const newParagraph = document.createElement('p');
            newParagraph.setAttribute('dir', 'auto');
            newParagraph.appendChild(textNode);
            this.editorElement.insertBefore(newParagraph, elementToConvert);
            this.editorElement.removeChild(elementToConvert);
            this._setCursor(newParagraph.firstChild, 0); // Cursor at the beginning of the new text
          } else {
            // If it's nested (e.g. LI in UL), this logic might need adjustment.
            // For now, let's assume we're dealing with block elements directly under editor.
            // This part could be more complex depending on desired behavior for nested structures.
            elementToConvert.parentNode.replaceChild(textNode, elementToConvert);
            this._setCursor(textNode, 0);
          }
          return; // Return after handling backspace.
        }
      }
    }
  }

  /**
   * @private
   * @method _convertToMarkdown
   * @description Converts an HTML string to Markdown using TurndownService.
   * @param {string} htmlContent - The HTML string to convert.
   * @returns {string} The Markdown representation.
   */
  _convertToMarkdown(htmlContent) {
    if (!this.turndownService) {
      console.error("TurndownService not initialized.");
      return ""; // Or throw an error
    }
    // Ensure we're passing a string to turndown
    let htmlInput = htmlContent;
    if (typeof htmlContent !== 'string') {
        if (htmlContent.outerHTML) {
            htmlInput = htmlContent.outerHTML;
        } else {
            // Fallback for nodes that don't have outerHTML (like text nodes)
            // Though typically we'd pass an element here.
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(htmlContent.cloneNode(true));
            htmlInput = tempDiv.innerHTML;
        }
    }

    // Basic cleaning: remove <br> from end of paragraphs if marked added them unnecessarily
    // Turndown has its own ways of handling breaks.
    // htmlInput = htmlInput.replace(/<br\s*\/?>\s*<\/(p|h[1-6]|li|blockquote)>/gi, '</$1>');

    let markdown = this.turndownService.turndown(htmlInput);

    // Turndown might add extra newlines, especially around block elements.
    // We can trim them if they are excessive for the "revert to markdown" feel.
    markdown = markdown.trim();

    // Specific prefix handling for elements that Turndown might not prefix by default in all contexts
    // e.g. if the HTML was just `<h1>foo</h1>` it becomes `# foo`
    // if it was `<blockquote><p>foo</p></blockquote>` it becomes `> foo`
    // List items `<li>foo</li>` become `* foo`

    // This step is generally handled well by Turndown's rules.
    // The main thing is to ensure the Turndown options are set correctly.
    // For example, for headings, `headingStyle: 'atx'` ensures `# ` prefix.
    // For list items, `bulletListMarker: '*'` ensures `* ` prefix.

    return markdown;
  }
}

// Export the class for use in other modules or directly in the browser
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = MarkdownEditor;
}
