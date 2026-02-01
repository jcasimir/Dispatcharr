import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Text, Alert } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { usePluginStore } from '../store/plugins';

const PluginView = () => {
  const { key } = useParams();
  const plugins = usePluginStore((s) => s.plugins);

  const plugin = plugins.find((p) => p.key === key);

  if (!plugin) {
    return (
      <Box p="xl">
        <Alert icon={<AlertCircle size={16} />} title="Plugin Not Found" color="red">
          The plugin "{key}" could not be found.
        </Alert>
      </Box>
    );
  }

  if (!plugin.enabled) {
    return (
      <Box p="xl">
        <Alert icon={<AlertCircle size={16} />} title="Plugin Disabled" color="yellow">
          The plugin "{plugin.name}" is currently disabled.
        </Alert>
      </Box>
    );
  }

  if (!plugin.view_content) {
    return (
      <Box p="xl">
        <Alert icon={<AlertCircle size={16} />} title="No Content" color="gray">
          The plugin "{plugin.name}" does not provide any view content.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p="md">
      <div dangerouslySetInnerHTML={{ __html: plugin.view_content }} />
    </Box>
  );
};

export default PluginView;
