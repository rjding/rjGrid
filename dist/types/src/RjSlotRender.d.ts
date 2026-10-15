import { type PropType } from 'vue';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    slots: {
        type: PropType<Readonly<{
            [name: string]: import("vue").Slot<any> | undefined;
        }>>;
        required: true;
    };
    name: {
        type: StringConstructor;
        required: true;
    };
    params: {
        type: PropType<any>;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>[] | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    slots: {
        type: PropType<Readonly<{
            [name: string]: import("vue").Slot<any> | undefined;
        }>>;
        required: true;
    };
    name: {
        type: StringConstructor;
        required: true;
    };
    params: {
        type: PropType<any>;
        default: undefined;
    };
}>> & Readonly<{}>, {
    params: any;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
export declare const RjFnRender: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    render: {
        type: PropType<(p: any) => any>;
        default: undefined;
    };
    params: {
        type: PropType<any>;
        required: true;
    };
}>, () => any, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    render: {
        type: PropType<(p: any) => any>;
        default: undefined;
    };
    params: {
        type: PropType<any>;
        required: true;
    };
}>> & Readonly<{}>, {
    render: (p: any) => any;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
