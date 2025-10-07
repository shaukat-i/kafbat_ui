import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAppParams from 'lib/hooks/useAppParams';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  clusterConnectConnectorPath,
  clusterConnectorsPath,
  ClusterNameRoute,
} from 'lib/paths';
import yup from 'lib/yupExtended';
import Editor from 'components/common/Editor/Editor';
import Select from 'components/common/Select/Select';
import { FormError } from 'components/common/Input/Input.styled';
import Input from 'components/common/Input/Input';
import { Button } from 'components/common/Button/Button';
import Heading from 'components/common/heading/Heading.styled';
import { useConnects, useCreateConnector } from 'lib/hooks/api/kafkaConnect';
import { Connect } from 'generated-sources';
import ResourcePageHeading from 'components/common/ResourcePageHeading/ResourcePageHeading';
import Papa from 'papaparse';
import * as S from './New.styled';

const validationSchema = yup.object().shape({
  name: yup.string().required(),
  config: yup.string().required().isJsonObject(),
});

interface FormValues {
  connectName: Connect['name'];
  name: string;
  config: string;
}

const New: React.FC = () => {
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const navigate = useNavigate();

  const { data: connects = [] } = useConnects(clusterName);
  const mutation = useCreateConnector(clusterName);

  const [isBulkLoading, setIsBulkLoading] = React.useState(false);

  const methods = useForm<FormValues>({
    mode: 'all',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      connectName: connects.length > 0 ? connects[0].name : '',
      name: '',
      config: '',
    },
  });
  const {
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting, isValid, errors },
    getValues,
    setValue,
  } = methods;

  React.useEffect(() => {
    if (connects && connects.length > 0 && !getValues().connectName) {
      setValue('connectName', connects[0].name);
    }
  }, [connects, getValues, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      const connector = await mutation.createResource({
        connectName: values.connectName,
        newConnector: {
          name: values.name,
          config: JSON.parse(values.config.trim()),
        },
      });

      if (connector) {
        navigate(
          clusterConnectConnectorPath(
            clusterName,
            connector.connect,
            connector.name
          )
        );
      }
    } catch (e) {
      // silently fail
    }
  };

  const connectOptions = connects.map(({ name: connectName }) => ({
    value: connectName,
    label: connectName,
  }));

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const validConnectors: { name: string; config: object }[] = [];

        results.data.forEach((row: any, index: number) => {
          const { name, config } = row;

          if (!name || !config) {
            console.warn(`Row ${index + 1} skipped: missing name/config`);
            return;
          }

          try {
            const parsedConfig = JSON.parse(config);
            validConnectors.push({ name, config: parsedConfig });
          } catch {
            console.warn(`Row ${index + 1} skipped: invalid JSON config`);
          }
        });

        if (validConnectors.length === 0) {
          console.warn('No valid connectors found in CSV.');
          setIsBulkLoading(false);
          return;
        }

        for (const connector of validConnectors) {
          try {
            await mutation.createResource({
              connectName: getValues('connectName'),
              newConnector: {
                name: connector.name,
                config: connector.config,
              },
            });
          } catch (err) {
            console.error(`Failed to create connector "${connector.name}"`, err);
          }
        }

        setIsBulkLoading(false);

        // ✅ Navigate back after all connectors are created
        navigate(clusterConnectorsPath(clusterName));
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setIsBulkLoading(false);
      },
    });

    e.target.value = ''; // reset file input
  };

  return (
    <FormProvider {...methods}>
      <ResourcePageHeading
        text="Create new connector"
        backTo={clusterConnectorsPath(clusterName)}
        backText="Connectors"
      />
      <S.NewConnectFormStyled
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Create connect form"
      >
        <S.Filed $hidden={connects?.length <= 1}>
          <Heading level={3}>Connect *</Heading>
          <Controller
            defaultValue={connectOptions[0]?.value}
            control={control}
            name="connectName"
            render={({ field: { name, onChange } }) => (
              <Select
                selectSize="M"
                name={name}
                disabled={isSubmitting || isBulkLoading}
                onChange={onChange}
                value={connectOptions[0]?.value}
                minWidth="100%"
                options={connectOptions}
              />
            )}
          />
          <FormError>
            <ErrorMessage errors={errors} name="connectName" />
          </FormError>
        </S.Filed>

        <div>
          <Heading level={3}>Name</Heading>
          <Input
            inputSize="M"
            placeholder="Connector Name"
            name="name"
            autoFocus
            autoComplete="off"
            disabled={isSubmitting || isBulkLoading}
          />
          <FormError>
            <ErrorMessage errors={errors} name="name" />
          </FormError>
        </div>

        <div>
          <Heading level={3}>Config</Heading>
          <Controller
            control={control}
            name="config"
            render={({ field }) => (
              <Editor {...field} readOnly={isSubmitting || isBulkLoading} ref={null} />
            )}
          />
          <FormError>
            <ErrorMessage errors={errors} name="config" />
          </FormError>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Button
            buttonSize="M"
            buttonType="primary"
            type="submit"
            disabled={!isValid || isSubmitting || !isDirty || isBulkLoading}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>

          <input
            id="csvInput"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleBulkImport}
          />
          <Button
            buttonSize="M"
            buttonType="secondary"
            type="button"
            onClick={() => document.getElementById('csvInput')?.click()}
            disabled={isBulkLoading}
          >
            {isBulkLoading ? 'Importing...' : 'Bulk Import CSV'}
          </Button>

          {isBulkLoading && (
            <span style={{ color: '#666', fontSize: '0.9rem' }}>
              ⏳ Importing connectors, please wait...
            </span>
          )}
        </div>
      </S.NewConnectFormStyled>
    </FormProvider>
  );
};

export default New;
