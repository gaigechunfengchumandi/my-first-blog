<!-- 片段图回顾 -->
<template>
    <g-patient-header :patientInfo="patientInfo"></g-patient-header>
    <div class="calc-height">
        <g-container sider1
                     sider1Title="片段图回顾"
                     siderWidth1="330px"
                     :isFllHeight="true">
            <template v-slot:sider1>
                <div class="ofh flex-col-b"
                     style="height: calc(100% - 40px);">
                    <div class="margin-t">
                        <g-form-item title="事件类型："
                                     :isAuto="true">
                            <el-select v-model="paramsData.searchForm.eventType"
                                       @change="paramsData.searchForm.eventNameCode=''"
                                       clearable
                                       class="w100"
                                       placeholder="请选择...">
                                <el-option label="全部"
                                           :value="0"></el-option>
                                <el-option v-for="item in eventType"
                                           :key="item.dictCode"
                                           :label="item.dictName"
                                           :value="item.dictCode"></el-option>
                            </el-select>
                        </g-form-item>
                        <g-form-item title="事件名称："
                                     :isAuto="true">
                            <el-select v-model="paramsData.searchForm.eventNameCode"
                                       clearable
                                       class="w100">
                                <el-option v-for="item in eventName[paramsData.searchForm.eventType]"
                                           :key="item.dictCode"
                                           :label="item.dictName"
                                           :value="item.dictCode" />
                            </el-select>
                        </g-form-item>
                        <g-form-item title="采集时间："
                                     :isAuto="true">
                            <el-date-picker v-model="paramsData.searchForm.time"
                                            class="w100"
                                            style="width:100%"
                                            type="daterange"
                                            unlink-panels
                                            range-separator="—"
                                            start-placeholder="开始日期"
                                            end-placeholder="结束日期"
                                            format="YYYY-MM-DD"
                                            value-format="YYYY-MM-DD"></el-date-picker>
                        </g-form-item>
                        <el-button type="primary"
                                   @click="onQuery">查询</el-button>
                        <el-button @click="onReset">重置</el-button>
                    </div>
                    <div class="f1 ofa margin-t">
                        <div v-if="tableData.length>0">
                            <el-card v-for="(item,index) in tableData"
                                     :key="index"
                                     :class="['margin-t','list-box',isSelect==item.snippetId?'active':'']"
                                     shadow="hover"
                                     @click="onSelectItem(item)">
                                <!-- <template #header> -->
                                <div :class="item.eventNameCode?'card-header card-border':'card-header'">
                                    <b class="margin-r">采集时间</b>
                                    <b class="margin-r">{{ item.collectStartTime }}</b>
                                    <b class="margin-r">至</b>
                                    <b>{{ item.collectEndTime }}</b>
                                </div>
                                <!-- </template> -->
                                <template v-if="item.eventNameCode">
                                    <div class="card-padding">
                                        <div :class="['card-box', getSnippetState(item.snippetState)]">
                                            {{ getEventFlags(item.eventNameCode)}}</div>
                                    </div>
                                </template>
                            </el-card>
                        </div>
                        <div v-else
                             class="padding">暂无数据</div>
                    </div>
                    <div class="tc margin-t">
                        <el-pagination :current-page="page.pageIndex"
                                       :page-size="page.pageSize"
                                       :page-sizes="pageSizeOpts"
                                       small
                                       layout="total, prev, pager, next"
                                       :total="page.pageTotal"
                                       @size-change="handleSizeChange"
                                       @current-change="handleCurrentChange" />
                    </div>
                </div>
            </template>
            <div class="pa h100 calc-height"
                 style="width:calc(100% - 338px);">
                <g-chart-ecg-static ref="ecgRef"
                                    v-model:wRange="ecgStatic.wRange"
                                    v-model:distance="ecgStatic.distance"
                                    v-model:dataPart="ecgStatic.dataPart"
                                    v-model:dataNum="ecgStatic.dataNum"
                                    :speed="25"
                                    :base="5"
                                    :grid="ecgStatic.grid"
                                    :name="ecgStatic.name"
                                    :timeRange="ecgStatic.timeRange?ecgStatic.timeRange:0"
                                    :data="ecgStatic.data"
                                    :scale="ecgStatic.scale"
                                    :handler="ecgStatic.handler" />
                <Scrollbar v-model="ecgStatic.distance"
                           :timeRange="ecgStatic.timeRange"
                           :wRange="ecgStatic.wRange"
                           :dataPart="ecgStatic.dataPart"
                           :dataNum="ecgStatic.dataNum" />
            </div>
        </g-container>
    </div>
</template>

<script setup name='FragmentMapReview'>
import { onMounted, reactive, ref, getCurrentInstance, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useTablePage } from "@c/tools/table.js";
import { getEventFlags } from "@c/tools/business.js"
import { eventType, eventName } from "@c/tools/dict.js"

import { getSnippetPageListAPI, getSnippetWaveDataAPI, getApplicationInfoAPI } from "@/modules/realTimeEcg/api/realMonitor"

import Scrollbar from './Scrollbar.vue'

const props = defineProps({})
const emit = defineEmits([''])
const { proxy } = getCurrentInstance();
const route = useRoute();

//搜索条件
let paramsData = reactive({
    query: {},
    searchForm: {
        eventType: 0,
        eventNameCode: '',
        time: [],
    }
})

//静态心电图
let ecgStatic = reactive({
    scale: 1,
    name: [],
    wRange: 0,
    distance: 0,
    dataPart: [],
    dataNum: 0,
    data: [],
    timeRange: 0,
    handler: false,
    grid: [2, 6]
})

//获取顶部信息
let patientInfo = ref({})
const getApplicationInfo = () => {
    getApplicationInfoAPI({ applicaionSubId: paramsData.query.applicationSubId }).then(res => {
        // console.log(res.result)
        patientInfo.value = res.result;
    })
}

//列表回调
const getListFun = () => {
    if (tableData.value.length > 0) {
        onSelectItem(tableData.value[0])
    } else {
        ecgStatic.data = [];
        ecgStatic.wRange = 0;
        ecgStatic.distance = 0;
        ecgStatic.dataNum = 0;
        ecgStatic.timeRange = 0;
        ecgStatic.handler = false;
    }
}
//列表表格方法
const { tableData, getList, pageSizeOpts,
    page, handleSizeChange, handleCurrentChange } = useTablePage({
        searchForm: paramsData.query,
        getListApi: getSnippetPageListAPI,
        getListFunc: getListFun
    })

//状态
const getSnippetState = (v) => {
    if (v == 2) {
        return "error-border"
    } else if (v == 1) {
        return "success-border"
    }
}

//选择片段图
let isSelect = ref('')
const onSelectItem = (v) => {
    isSelect.value = v.snippetId;
    //  v.snippetId
    //  console.log(v.snippetId, 9999)
    getSnippetWaveDataAPI({ snippetId: v.snippetId }).then(res => {
        ecgStatic.timeRange = (res.result?.waveList?.[0]?.waveData.length || 0) / (res.result?.sampleRate || 250)
        ecgStatic.data = res.result?.waveList?.map(i => {
            ecgStatic.name.push(i?.waveName || '')
            return i?.waveData || []
        })
        ecgStatic.handler = val => (val * res.result?.scale * res.result?.gain * ecgStatic.scale) / 100
        //   console.log(res.result,444)
        console.log(ecgStatic, 555)
    }).catch(err => {
        // console.log(err,55555)
        ecgStatic.data = [];
        ecgStatic.wRange = 0;
        ecgStatic.distance = 0;
        ecgStatic.dataNum = 0;
        ecgStatic.timeRange = 0;
        ecgStatic.handler = false;
    })
}

//查询
const onQuery = async () => {
    paramsData.query.snippetId = null;
    paramsData.query.snippetState = 0;
    paramsData.query.eventType = paramsData.searchForm.eventType ? paramsData.searchForm.eventType : 0;
    paramsData.query.eventNameCode = paramsData.searchForm.eventNameCode;
    if (paramsData.searchForm.time && paramsData.searchForm.time.length > 0) {
        paramsData.query.collectStartTime = paramsData.searchForm.time[0];
        paramsData.query.collectEndTime = paramsData.searchForm.time[1];
    } else {
        paramsData.query.collectStartTime = "";
        paramsData.query.collectEndTime = "";
    }
    //   console.log(paramsData.query, 99999)
    await getList();
}

//重置
const onReset = () => {
    paramsData.query.snippetId = null;
    paramsData.query.snippetState = 0;
    paramsData.searchForm.eventNameCode = '';
    paramsData.searchForm.time = [];
    paramsData.query.eventType = 0;
    paramsData.query.eventNameCode = '';
    getList();
}

//初始化数据
const initData = () => {
    if (route.query && route.query.id) {
        paramsData.query.applicationSubId = route.query.id;
    }
    if (route.query && route.query.snippetId && route.query.snippetId != '0') {
        paramsData.query.snippetId = route.query.snippetId;
    }
    getApplicationInfo();
    getList();
}
onMounted(() => {
    initData();
})

</script>
<style lang='scss' scoped>
.calc-height {
    height: calc(100vh - 48px);
}
.list-box {
    cursor: pointer;
    .card-header {
        padding: 6px 8px;
        box-sizing: border-box;
    }
    .card-border{
        border-bottom: 1px solid #e4e7ed;
    }
    .card-padding {
        padding-top: 8px;
    }
    .card-box {
        height: 36px;
        line-height: 36px;
        padding-left: 16px;
    }
    .success-border {
        border-left: 3px solid $green;
    }
    .error-border {
        border-left: 3px solid $red;
    }
}
.list-box:hover,
.active {
    background-color: #d7e0ed;
    // background-color: $select-color-bg;
}
</style>