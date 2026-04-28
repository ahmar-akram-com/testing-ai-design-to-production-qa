import fs from 'node:fs/promises';
import path from 'node:path';

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function collectTextNodes(node, result = []) {
  if (!node) {
    return result;
  }

  if (node.type === 'TEXT' && node.characters) {
    result.push({
      id: node.id,
      name: node.name,
      text: node.characters,
      style: node.style || {},
      absoluteBoundingBox: node.absoluteBoundingBox || null,
    });
  }

  for (const child of node.children || []) {
    collectTextNodes(child, result);
  }

  return result;
}

function collectFills(node, result = []) {
  if (!node) {
    return result;
  }

  if (Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill?.type === 'SOLID' && fill.color) {
        result.push({
          nodeId: node.id,
          name: node.name,
          color: fill.color,
          opacity: fill.opacity ?? 1,
        });
      }
    }
  }

  for (const child of node.children || []) {
    collectFills(child, result);
  }

  return result;
}

export async function extractFigmaDesign(config) {
  const outputDir = path.join(config.outputDir, 'figma');
  await fs.mkdir(outputDir, { recursive: true });

  const warnings = [];
  const result = {
    available: false,
    outputDir,
    screenshotPath: '',
    nodePath: '',
    textNodes: [],
    fills: [],
    frame: null,
    warnings,
  };

  if (!config.figmaToken) {
    warnings.push('FIGMA_TOKEN is missing. Exact node data and frame export were skipped.');
    await writeJson(path.join(outputDir, 'figma-summary.json'), result);
    return result;
  }

  if (!config.figmaFileKey || !config.figmaNodeId) {
    warnings.push('FIGMA_FILE_KEY or FIGMA_NODE_ID is missing. Figma extraction was skipped.');
    await writeJson(path.join(outputDir, 'figma-summary.json'), result);
    return result;
  }

  const headers = { 'X-Figma-Token': config.figmaToken };
  const nodeUrl = `https://api.figma.com/v1/files/${config.figmaFileKey}/nodes?ids=${encodeURIComponent(config.figmaNodeId)}`;
  const imageUrl = `https://api.figma.com/v1/images/${config.figmaFileKey}?ids=${encodeURIComponent(config.figmaNodeId)}&format=png&scale=1`;

  const nodeResponse = await fetch(nodeUrl, { headers });
  if (!nodeResponse.ok) {
    warnings.push(`Figma node request failed: ${nodeResponse.status} ${nodeResponse.statusText}`);
    await writeJson(path.join(outputDir, 'figma-summary.json'), result);
    return result;
  }

  const nodeData = await nodeResponse.json();
  const nodePath = path.join(outputDir, 'node.json');
  await writeJson(nodePath, nodeData);

  const documentNode = nodeData.nodes?.[config.figmaNodeId]?.document || null;
  result.available = Boolean(documentNode);
  result.nodePath = nodePath;
  result.frame = documentNode
    ? {
        id: documentNode.id,
        name: documentNode.name,
        type: documentNode.type,
        absoluteBoundingBox: documentNode.absoluteBoundingBox || null,
      }
    : null;
  result.textNodes = collectTextNodes(documentNode);
  result.fills = collectFills(documentNode);

  const imageResponse = await fetch(imageUrl, { headers });
  if (imageResponse.ok) {
    const imageData = await imageResponse.json();
    const frameUrl = imageData.images?.[config.figmaNodeId];

    if (frameUrl) {
      const pngResponse = await fetch(frameUrl);
      if (pngResponse.ok) {
        const screenshotPath = path.join(outputDir, 'figma-frame.png');
        await fs.writeFile(screenshotPath, Buffer.from(await pngResponse.arrayBuffer()));
        result.screenshotPath = screenshotPath;
      } else {
        warnings.push(`Figma frame PNG download failed: ${pngResponse.status} ${pngResponse.statusText}`);
      }
    } else {
      warnings.push('Figma image endpoint did not return a frame URL.');
    }
  } else {
    warnings.push(`Figma image request failed: ${imageResponse.status} ${imageResponse.statusText}`);
  }

  await writeJson(path.join(outputDir, 'figma-summary.json'), result);
  return result;
}

