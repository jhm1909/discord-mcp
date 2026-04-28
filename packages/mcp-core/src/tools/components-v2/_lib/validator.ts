import { ComponentTypeId } from './schema.js';

export interface ValidatorIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
  readonly fix_hint?: string;
}

export interface ValidatorResult {
  readonly valid: boolean;
  readonly issues: readonly ValidatorIssue[];
}

interface Node {
  type?: number;
  components?: Node[];
  items?: unknown[];
  accessory?: { type?: number };
  custom_id?: string;
  url?: string;
  style?: number;
  content?: string;
  file?: { url?: string };
  media?: { url?: string };
}

function countRecursive(nodes: readonly Node[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1;
    if (Array.isArray(n.components)) count += countRecursive(n.components);
    if (n.type === ComponentTypeId.Section && n.accessory !== undefined) count += 1;
  }
  return count;
}

function toNodes(input: unknown): Node[] {
  if (!Array.isArray(input)) return [];
  return input as Node[];
}

export function validateComponentsV2(input: unknown): ValidatorResult {
  const issues: ValidatorIssue[] = [];
  const components = toNodes(input);

  const total = countRecursive(components);
  if (total > 40) {
    issues.push({
      path: 'components',
      code: 'OVER_40',
      message: `Total components ${total} exceeds 40-cap.`,
      fix_hint: 'Split content across multiple messages or move items into a Container with fewer children.',
    });
  }

  const walk = (nodes: readonly Node[], path: string, parentType: number | null): void => {
    nodes.forEach((node, idx) => {
      const here = `${path}[${idx}]`;

      if (node.type === ComponentTypeId.Container && parentType === ComponentTypeId.Container) {
        issues.push({
          path: here,
          code: 'CONTAINER_IN_CONTAINER',
          message: 'Container cannot be nested inside another Container.',
          fix_hint: 'Move the inner components up one level or use a Section instead.',
        });
      }

      if (node.type === ComponentTypeId.Container && Array.isArray(node.components) && node.components.length > 10) {
        issues.push({
          path: here,
          code: 'CONTAINER_OVER_10',
          message: `Container has ${node.components.length} children; cap is 10.`,
          fix_hint: 'Split into multiple Containers or reduce TextDisplay count.',
        });
      }

      if (node.type === ComponentTypeId.ActionRow && Array.isArray(node.components) && node.components.length > 5) {
        issues.push({
          path: here,
          code: 'ACTIONROW_OVER_5',
          message: `ActionRow has ${node.components.length} components; cap is 5.`,
        });
      }

      if (node.type === ComponentTypeId.Thumbnail && parentType !== ComponentTypeId.Section) {
        issues.push({
          path: here,
          code: 'THUMBNAIL_STANDALONE',
          message: 'Thumbnail is only valid as a Section.accessory.',
        });
      }

      if (node.type === ComponentTypeId.Section && node.accessory !== undefined) {
        const at = node.accessory.type;
        if (at !== ComponentTypeId.Thumbnail && at !== ComponentTypeId.Button) {
          issues.push({
            path: `${here}.accessory`,
            code: 'INVALID_ACCESSORY',
            message: `Section accessory must be Thumbnail (11) or Button (2); got type ${at}.`,
          });
        }
      }

      if (node.type === ComponentTypeId.MediaGallery) {
        const itemCount = Array.isArray(node.items) ? node.items.length : 0;
        if (itemCount < 1 || itemCount > 10) {
          issues.push({
            path: `${here}.items`,
            code: 'GALLERY_RANGE',
            message: `MediaGallery items length ${itemCount} outside 1-10.`,
          });
        }
      }

      if (node.type === ComponentTypeId.Button && node.custom_id === undefined && node.url === undefined) {
        issues.push({
          path: here,
          code: 'BUTTON_NO_ID_OR_URL',
          message: 'Button needs either custom_id (action) or url (link, style 5).',
        });
      }

      if (Array.isArray(node.components)) {
        walk(node.components, `${here}.components`, node.type ?? null);
      }

      // Walk ActionRow children for Button checks
      if (node.type === ComponentTypeId.ActionRow && Array.isArray(node.components)) {
        node.components.forEach((child, cidx) => {
          const childHere = `${here}.components[${cidx}]`;
          if (child.type === ComponentTypeId.Button && child.custom_id === undefined && child.url === undefined) {
            // already walked above via the components walk
          }
          void childHere;
        });
      }
    });
  };

  walk(components, 'components', null);

  return { valid: issues.length === 0, issues };
}
