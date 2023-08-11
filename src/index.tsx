import {useEffect} from 'react'
import * as R from 'remeda';
import {SetFieldValue, UseFormWatch, FieldValues, UnpackNestedValue} from 'react-hook-form'

export interface FormPersistConfig<TFieldValues extends FieldValues = any> {
    storage?: Storage;
    watch: UseFormWatch<TFieldValues>;
    setValue: SetFieldValue<TFieldValues>;
    exclude?: Array<keyof UnpackNestedValue<TFieldValues>>;
    onDataRestored?: (data: any) => void;
    validate?: boolean;
    dirty?: boolean;
    touch?: boolean;
    onTimeout?: () => void;
    timeout?: number;
}

const useFormPersist = <TFieldValues extends FieldValues = any>(
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
        onTimeout,
        timeout
    }: FormPersistConfig<TFieldValues>
) => {
    const watchedValues = watch()

    const getStorage = () => storage || window.sessionStorage

    const clearStorage = () => getStorage().removeItem(name)

    useEffect(() => {
        const str = getStorage().getItem(name)

        if (str) {
            const {_timestamp = null, ...values} = JSON.parse(str)
            const dataRestored: { [key: string]: any } = {}
            const currTimestamp = Date.now()

            if (timeout && (currTimestamp - _timestamp) > timeout) {
                onTimeout && onTimeout()
                clearStorage()
                return
            }

            Object.entries(values)
                .filter(([key, value]) => !exclude.includes(key) && !R.equals(value, watchedValues[key]))
                .forEach(([key, value]) => {
                    dataRestored[key] = value;

                    setValue(key, value, {
                        shouldValidate: validate,
                        shouldDirty: dirty,
                        shouldTouch: touch,
                    });
                });

            if (onDataRestored) {
                onDataRestored(dataRestored)
            }
        }
    }, [
        storage,
        name,
        onDataRestored,
        setValue
    ])

    useEffect(() => {
        const values = R.omit(watchedValues, exclude)

        if (Object.entries(values).length) {
            if (timeout !== undefined) {
                // @ts-ignore
                values._timestamp = Date.now()
            }
            getStorage().setItem(name, JSON.stringify(values))
        }
    }, [watchedValues, timeout])

    return {
        clear: () => getStorage().removeItem(name)
    }
}

export default useFormPersist
