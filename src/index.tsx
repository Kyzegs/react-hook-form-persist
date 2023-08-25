/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useEffect } from 'react';
import * as R from 'remeda';
import {
    type FieldValue,
    type FieldValues,
    type SetFieldValue,
    type UseFormWatch,
} from 'react-hook-form';

export type FormPersistConfig<TFieldValues extends FieldValues = FieldValues> = {
    storage?: Storage;
    watch: UseFormWatch<TFieldValues>;
    setValue: SetFieldValue<TFieldValues>;
    exclude?: Array<FieldValue<TFieldValues>>;
    onDataRestored?: (data: any) => void;
    validate?: boolean;
    dirty?: boolean;
    touch?: boolean;
    onTimeout?: () => void;
    timeout?: number;
};

const useFormPersist = <TFieldValues extends FieldValues = FieldValues>(
    name: string,
    {
        storage,
        watch,
        setValue,
        exclude = [],
        onDataRestored,
        validate = false,
        dirty = false,
        touch = false,
        onTimeout = () => {},
        timeout,
    }: FormPersistConfig<TFieldValues>,
) => {
    const watchedValues = watch();

    const getStorage = () => storage ?? window.sessionStorage;

    const clearStorage = () => {
        getStorage().removeItem(name);
    };

    useEffect(() => {
        const str = getStorage().getItem(name);

        if (str) {
            const { _timestamp = null, ...values }: { _timestamp: number | null } & Partial<TFieldValues> = JSON.parse(str);
            const dataRestored: Partial<TFieldValues> = {};

            if (timeout && _timestamp && (Date.now() - _timestamp) > timeout) {
                onTimeout();
                clearStorage();
                return;
            }

            Object.entries(values)
                .filter(([key, value]) => !exclude.includes(key) && !R.equals(value, watchedValues[key]))
                .forEach(([key, value]) => {
                    // @ts-expect-error Should be able to index it just fine
                    dataRestored[key] = value;

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    setValue(key, value, {
                        shouldValidate: validate,
                        shouldDirty: dirty,
                        shouldTouch: touch,
                    });
                });

            if (onDataRestored) {
                onDataRestored(dataRestored);
            }
        }
    }, [storage, name, onDataRestored, setValue]);

    useEffect(() => {
        const values = R.omit(watchedValues, exclude);

        if (Object.entries(values).length) {
            if (timeout !== undefined) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                values._timestamp = Date.now();
            }

            getStorage().setItem(name, JSON.stringify(values));
        }
    }, [watchedValues, timeout]);

    return {
        clear() {
            getStorage().removeItem(name);
        },
    };
};

export default useFormPersist;
