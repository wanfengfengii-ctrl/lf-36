import React, { useEffect, useState, useCallback } from 'react';
import { Box, Paper, styled, Divider, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Layers as LayersIcon,
  StackedLineChart as OverlapIcon,
  JoinInner as EdgeIcon,
  HourglassEmpty as PendingIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/useAppStore';
import AppToolbar from '../components/toolbar/AppToolbar';
import MapCanvas from '../components/canvas/MapCanvas';
import FragmentList from '../components/left-panel/FragmentList';
import PropertyEditor from '../components/left-panel/PropertyEditor';
import ImportButton from '../components/left-panel/ImportButton';
import AssemblyOrder from '../components/right-panel/AssemblyOrder';
import OverlapList from '../components/right-panel/OverlapList';
import EdgeFitPanel from '../components/right-panel/EdgeFitPanel';
import PendingFragments from '../components/right-panel/PendingFragments';
import AnnotationPanel from '../components/right-panel/AnnotationPanel';
import ToastContainer from '../components/common/ToastContainer';
import AnnotationEditorDialog from '../components/common/AnnotationEditorDialog';
import ReviewCenterDialog from '../components/common/ReviewCenterDialog';
import type { Annotation, AnnotationBounds } from '../types';

const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  background: theme.palette.background.default,
}));

const ContentArea = styled(Box)(({ theme }) => ({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
}));

const LeftPanel = styled(Paper)(({ theme }) => ({
  width: 280,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

const CanvasPanel = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  minWidth: 0,
}));

const RightPanel = styled(Paper)(({ theme }) => ({
  width: 320,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

const PanelSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: 0,
  },
  '& .MuiAccordionSummary-root': {
    padding: theme.spacing(0, 1.5),
    minHeight: 40,
    '&.Mui-expanded': {
      minHeight: 40,
    },
  },
  '& .MuiAccordionSummary-content': {
    margin: theme.spacing(0.5, 0),
    '&.Mui-expanded': {
      margin: theme.spacing(0.5, 0),
    },
  },
  '& .MuiAccordionDetails-root': {
    padding: theme.spacing(1, 1.5, 1.5),
  },
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.8),
  '& svg': {
    fontSize: 18,
    color: theme.palette.secondary.dark,
  },
}));

const Home: React.FC = () => {
  const init = useAppStore((s) => s.init);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const persist = useAppStore((s) => s.persist);
  const selectedFragmentId = useAppStore((s) => s.selectedFragmentId);
  const removeFragment = useAppStore((s) => s.removeFragment);
  const toggleLock = useAppStore((s) => s.toggleLock);
  const addToast = useAppStore((s) => s.addToast);
  const { annotationMode, setAnnotationMode } = useAppStore();
  const [rightExpanded, setRightExpanded] = useState<string[]>(['annotation', 'assembly', 'overlap', 'edgefit', 'pending']);
  const [annotationEditorOpen, setAnnotationEditorOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [defaultBounds, setDefaultBounds] = useState<AnnotationBounds | null>(null);
  const [reviewCenterOpen, setReviewCenterOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((ctrlOrCmd && e.key === 'y') || (ctrlOrCmd && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      } else if (ctrlOrCmd && e.key === 's') {
        e.preventDefault();
        persist();
        addToast('success', '方案已保存');
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFragmentId) {
        const activeElement = document.activeElement;
        const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          removeFragment(selectedFragmentId);
        }
      } else if (ctrlOrCmd && e.key === 'l' && selectedFragmentId) {
        e.preventDefault();
        toggleLock(selectedFragmentId);
      } else if (ctrlOrCmd && e.key === 'm') {
        e.preventDefault();
        setAnnotationMode(!annotationMode);
        addToast('info', `批注模式已${annotationMode ? '关闭' : '开启'}`);
      } else if (ctrlOrCmd && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        setReviewCenterOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, persist, removeFragment, toggleLock, selectedFragmentId, addToast, annotationMode, setAnnotationMode]);

  const handleAccordionChange = (panel: string) => (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setRightExpanded((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };

  const handleAddAnnotation = useCallback(() => {
    setEditingAnnotation(null);
    setDefaultBounds(null);
    setAnnotationEditorOpen(true);
  }, []);

  const handleAreaSelected = useCallback((bounds: AnnotationBounds) => {
    setEditingAnnotation(null);
    setDefaultBounds(bounds);
    setAnnotationEditorOpen(true);
  }, []);

  const handleEditAnnotation = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setAnnotationEditorOpen(true);
  }, []);

  return (
    <MainContainer>
      <AppToolbar onOpenReviewCenter={() => setReviewCenterOpen(true)} />
      <ContentArea>
        <LeftPanel elevation={1}>
          <PanelSection>
            <ImportButton />
          </PanelSection>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PanelSection sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1, overflow: 'auto', pr: 0.5 }}>
                <FragmentList />
              </Box>
            </PanelSection>
          </Box>
          <Divider />
          <Box sx={{ maxHeight: '55%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <PropertyEditor />
            </Box>
          </Box>
        </LeftPanel>

        <CanvasPanel>
          <MapCanvas onAreaSelected={handleAreaSelected} />
        </CanvasPanel>

        <RightPanel elevation={1}>
          <StyledAccordion
            expanded={rightExpanded.includes('annotation')}
            onChange={handleAccordionChange('annotation')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
              <SectionHeader>
                <CommentIcon />
                <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                  考据批注
                </Typography>
              </SectionHeader>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, height: 320 }}>
              <AnnotationPanel
                onAddAnnotation={handleAddAnnotation}
                onEditAnnotation={handleEditAnnotation}
              />
            </AccordionDetails>
          </StyledAccordion>

          <StyledAccordion
            expanded={rightExpanded.includes('assembly')}
            onChange={handleAccordionChange('assembly')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
              <SectionHeader>
                <LayersIcon />
                <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                  拼幅顺序
                </Typography>
              </SectionHeader>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              <AssemblyOrder />
            </AccordionDetails>
          </StyledAccordion>

          <StyledAccordion
            expanded={rightExpanded.includes('overlap')}
            onChange={handleAccordionChange('overlap')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
              <SectionHeader>
                <OverlapIcon />
                <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                  重叠区域
                </Typography>
              </SectionHeader>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              <OverlapList />
            </AccordionDetails>
          </StyledAccordion>

          <StyledAccordion
            expanded={rightExpanded.includes('edgefit')}
            onChange={handleAccordionChange('edgefit')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
              <SectionHeader>
                <EdgeIcon />
                <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                  边缘吻合度
                </Typography>
              </SectionHeader>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              <EdgeFitPanel />
            </AccordionDetails>
          </StyledAccordion>

          <StyledAccordion
            expanded={rightExpanded.includes('pending')}
            onChange={handleAccordionChange('pending')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
              <SectionHeader>
                <PendingIcon />
                <Typography variant="subtitle2" sx={{ fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                  未处理碎片
                </Typography>
              </SectionHeader>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              <PendingFragments />
            </AccordionDetails>
          </StyledAccordion>
        </RightPanel>
      </ContentArea>
      <ToastContainer />
      <AnnotationEditorDialog
        open={annotationEditorOpen}
        onClose={() => { setAnnotationEditorOpen(false); setDefaultBounds(null); }}
        annotation={editingAnnotation}
        defaultBounds={defaultBounds}
      />
      <ReviewCenterDialog
        open={reviewCenterOpen}
        onClose={() => setReviewCenterOpen(false)}
      />
    </MainContainer>
  );
};

export default Home;
