import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { type UseFormProps } from 'react-hook-form/dist/types';
import userEvent from '@testing-library/user-event';
import useFormPersist, { type FormPersistConfig } from '../src';

const STORAGE_KEY = 'STORAGE_KEY';

const Form = ({ config = {}, props = {} }: { config?: Partial<FormPersistConfig>; props?: UseFormProps }) => {
    const { register, watch, setValue } = useForm(props);

    useFormPersist(STORAGE_KEY, { watch, setValue, ...config });

    return (
        <form>
            <label>
                 foo:
                <input id='foo' {...register('foo')} />
            </label>
            <label>
                bar:
                <input id='bar' {...register('bar')} />
            </label>
            <label>
                 baz:
                <input id='baz' {...register('baz')} />
            </label>
            <button type='submit'>submit</button>
        </form>
    );
};

describe('react-hook-form-persist', () => {
    test('should persist fields in storage', async () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem');

        render(<Form />);

        await userEvent.type(screen.getByLabelText('foo:'), 'foo');

        expect(spy).toHaveBeenCalled();

        expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
            foo: 'foo',
            bar: '',
            baz: '',
        });
    });

    test('should retrieve stored fields', async () => {
        const spy = vi.spyOn(Storage.prototype, 'getItem');

        const { unmount } = render(<Form />);

        await userEvent.type(screen.getByLabelText('foo:'), 'foo');

        unmount();
        render(<Form />);

        expect(spy).toHaveBeenCalled();
        expect(screen.getByLabelText('foo:')).toHaveValue('foo');
    });

    test('should not persist excluded fields', async () => {
        render(<Form config={{ exclude: ['baz', 'foo'] }} />);

        await userEvent.type(screen.getByLabelText('foo:'), 'foo');
        await userEvent.type(screen.getByLabelText('bar:'), 'bar');
        await userEvent.type(screen.getByLabelText('baz:'), 'baz');

        expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
            bar: 'bar',
        });
    });

    test('should support timeout config option', async () => {
        const now = Date.now();
        const { unmount } = render(<Form config={{ timeout: 1000 }} />);

        const spy = vi.spyOn(Date, 'now').mockReturnValue(now);

        await userEvent.type(screen.getByLabelText('foo:'), 'foo');
        await userEvent.type(screen.getByLabelText('bar:'), 'bar');
        await userEvent.type(screen.getByLabelText('baz:'), 'baz');

        expect(spy).toBeCalled();
        expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
            bar: 'bar',
            baz: 'baz',
            foo: 'foo',
            _timestamp: now,
        });

        unmount();
        spy.mockImplementation(() => now + 4000);
        const clearSpy = vi.spyOn(Storage.prototype, 'removeItem');

        render(<Form config={{ timeout: 1000 }} />);

        expect(clearSpy).toBeCalled();
        expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({});
    });

    test('should not set value if diff is equal', async () => {
        const setValue = vi.fn(() => {});

        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

        render(<Form config={{ setValue }} props={{ defaultValues: { foo: 'bar' } }} />);

        expect(setValue).toHaveBeenCalledTimes(0);
    });

    test('should set value if diff is different', async () => {
        const setValue = vi.fn(() => {});

        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'baz' }));

        render(<Form config={{ setValue }} props={{ defaultValues: { foo: 'bar' } }} />);

        expect(setValue).toHaveBeenCalledOnce();
    });

    test('should call onDataRestored callback', async () => {
        const onDataRestored = vi.fn(() => {});

        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

        render(<Form config={{ onDataRestored }} />);

        expect(onDataRestored).toHaveBeenCalledOnce();
        expect(onDataRestored).toHaveBeenCalledWith({ foo: 'bar' });
    });

    test('should clear storage', async () => {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'baz' }));

        const { result: formResult } = renderHook(() => useForm());
        const { result: formPersistResult } = renderHook(() => useFormPersist(STORAGE_KEY, {
            watch: formResult.current.watch,
            setValue: formResult.current.setValue,

        }));

        formPersistResult.current.clear();

        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
