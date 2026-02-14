package synctex

import (
	"bufio"
	"compress/gzip"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type SyncTeXData struct {
	Version       int
	Magnification float64
	Unit          int
	XOffset       float64
	YOffset       float64
	Files         map[int]string
	Pages         map[int][]*Node
	mtime         time.Time
}

type Node struct {
	Page   int
	Tag    int
	Line   int
	Column int
	H      float64
	V      float64
	Width  float64
	Height float64
	Depth  float64
}

func ParseSyncTeXGz(path string) (*SyncTeXData, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open synctex file: %w", err)
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return nil, fmt.Errorf("failed to stat synctex file: %w", err)
	}

	var reader io.Reader = f
	if strings.HasSuffix(path, ".gz") {
		gzReader, err := gzip.NewReader(f)
		if err != nil {
			return nil, fmt.Errorf("failed to create gzip reader: %w", err)
		}
		defer gzReader.Close()
		reader = gzReader
	}

	data, err := ParseSyncTeX(reader)
	if err != nil {
		return nil, err
	}
	data.mtime = info.ModTime()
	return data, nil
}

func ParseSyncTeX(r io.Reader) (*SyncTeXData, error) {
	data := &SyncTeXData{
		Files:         make(map[int]string),
		Pages:         make(map[int][]*Node),
		Unit:          1,
		XOffset:       72.0,
		YOffset:       72.0,
		Magnification: 1.0,
	}

	scanner := bufio.NewScanner(r)
	section := ""
	currentPage := 0

	for scanner.Scan() {
		line := scanner.Text()
		if len(line) == 0 {
			continue
		}

		switch {
		case strings.HasPrefix(line, "SyncTeX Version:"):
			section = "preamble"
			v, _ := strconv.Atoi(strings.TrimSpace(strings.TrimPrefix(line, "SyncTeX Version:")))
			data.Version = v

		case strings.HasPrefix(line, "Input:"):
			parts := strings.SplitN(line, ":", 3)
			if len(parts) >= 3 {
				tag, _ := strconv.Atoi(parts[1])
				data.Files[tag] = parts[2]
			}

		case strings.HasPrefix(line, "Magnification:"):
			v, _ := strconv.ParseFloat(strings.TrimSpace(strings.TrimPrefix(line, "Magnification:")), 64)
			data.Magnification = v / 1000.0

		case strings.HasPrefix(line, "Unit:"):
			v, _ := strconv.Atoi(strings.TrimSpace(strings.TrimPrefix(line, "Unit:")))
			if v > 0 {
				data.Unit = v
			}

		case strings.HasPrefix(line, "X Offset:"):
			v, _ := strconv.ParseFloat(strings.TrimSpace(strings.TrimPrefix(line, "X Offset:")), 64)
			data.XOffset = v

		case strings.HasPrefix(line, "Y Offset:"):
			v, _ := strconv.ParseFloat(strings.TrimSpace(strings.TrimPrefix(line, "Y Offset:")), 64)
			data.YOffset = v

		case strings.HasPrefix(line, "Content:"):
			section = "content"

		case strings.HasPrefix(line, "Count:"):
			section = "postamble"

		case section == "content":
			if len(line) > 0 && line[0] == '{' {
				pageNum, _ := strconv.Atoi(strings.TrimSpace(line[1:]))
				if pageNum > 0 {
					currentPage = pageNum
				}
			} else if len(line) > 0 && line[0] == '}' {
				currentPage = 0
			} else {
				data.parseContentLine(line, currentPage)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error scanning synctex file: %w", err)
	}

	return data, nil
}

func (d *SyncTeXData) parseContentLine(line string, currentPage int) {
	if len(line) == 0 {
		return
	}

	switch line[0] {
	case '{', '}', '<', '>', '[', ']', '(', ')', '!', 'f':
		return
	case 'v', 'h', 'k', 'g', '$', 'x':
		d.parseNodeLine(line, currentPage)
	}
}

func (d *SyncTeXData) parseNodeLine(line string, currentPage int) {
	if len(line) < 2 {
		return
	}

	nodeType := line[0]
	if nodeType != 'v' && nodeType != 'h' && nodeType != 'x' && nodeType != 'k' && nodeType != 'g' && nodeType != '$' {
		return
	}

	parts := strings.Split(line[1:], ",")
	if len(parts) < 4 {
		return
	}

	node := &Node{Page: currentPage}

	switch nodeType {
	case 'v', 'h':
		node.Tag, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
		node.Line, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
		if len(parts) >= 3 {
			node.Column, _ = strconv.Atoi(strings.TrimSpace(parts[2]))
		}
		if len(parts) >= 7 {
			h, _ := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
			v, _ := strconv.ParseFloat(strings.TrimSpace(parts[4]), 64)
			w, _ := strconv.ParseFloat(strings.TrimSpace(parts[5]), 64)
			h2, _ := strconv.ParseFloat(strings.TrimSpace(parts[6]), 64)
			dVal := 0.0
			if len(parts) >= 8 {
				dVal, _ = strconv.ParseFloat(strings.TrimSpace(parts[7]), 64)
			}
			node.H = d.toPoints(h)
			node.V = d.toPoints(v)
			node.Width = d.toPoints(w)
			node.Height = d.toPoints(h2)
			node.Depth = d.toPoints(dVal)
		}
	case 'x':
		node.Tag, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
		node.Line, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
		if len(parts) >= 3 {
			node.Column, _ = strconv.Atoi(strings.TrimSpace(parts[2]))
		}
		if len(parts) >= 6 {
			h, _ := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
			v, _ := strconv.ParseFloat(strings.TrimSpace(parts[4]), 64)
			w, _ := strconv.ParseFloat(strings.TrimSpace(parts[5]), 64)
			node.H = d.toPoints(h)
			node.V = d.toPoints(v)
			node.Width = d.toPoints(w)
		}
	case 'k', 'g':
		node.Tag, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
		node.Line, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
		if len(parts) >= 5 {
			h, _ := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
			v, _ := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
			w, _ := strconv.ParseFloat(strings.TrimSpace(parts[4]), 64)
			node.H = d.toPoints(h)
			node.V = d.toPoints(v)
			node.Width = d.toPoints(w)
		}
	case '$':
		node.Tag, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
		node.Line, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
		if len(parts) >= 4 {
			h, _ := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
			v, _ := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
			node.H = d.toPoints(h)
			node.V = d.toPoints(v)
		}
	}

	if node.Tag > 0 && node.Line > 0 && node.Page > 0 {
		d.Pages[node.Page] = append(d.Pages[node.Page], node)
	}
}

func (d *SyncTeXData) toPoints(val float64) float64 {
	if d.Unit <= 0 {
		return val / 65536.0
	}
	return val / float64(d.Unit)
}

func (d *SyncTeXData) toPDFCoords(h, v float64) (x, y float64) {
	x = h + d.XOffset
	y = v + d.YOffset
	return
}

func (d *SyncTeXData) fromPDFCoords(x, y float64) (h, v float64) {
	h = x - d.XOffset
	v = y - d.YOffset
	return
}

func (d *SyncTeXData) ForwardSearch(filename string, line, col int) (*ViewResult, error) {
	filename = filepath.Clean(filename)

	targetTag := 0
	for tag, path := range d.Files {
		if filepath.Clean(path) == filename || strings.HasSuffix(path, filename) {
			targetTag = tag
			break
		}
	}

	if targetTag == 0 {
		for tag, path := range d.Files {
			baseTag := filepath.Base(path)
			baseInput := filepath.Base(filename)
			if baseTag == baseInput {
				targetTag = tag
				break
			}
		}
	}

	if targetTag == 0 {
		return nil, fmt.Errorf("file not found in synctex data: %s", filename)
	}

	var candidates []*Node
	for _, nodes := range d.Pages {
		for _, node := range nodes {
			if node.Tag == targetTag && node.Line == line {
				if col > 0 && node.Column > 0 && node.Column != col {
					continue
				}
				candidates = append(candidates, node)
			}
		}
	}

	if len(candidates) == 0 {
		for _, nodes := range d.Pages {
			for _, node := range nodes {
				if node.Tag == targetTag {
					diff := abs(node.Line - line)
					if diff <= 1 {
						candidates = append(candidates, node)
					}
				}
			}
		}
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("no matching node found for %s:%d", filename, line)
	}

	sort.Slice(candidates, func(i, j int) bool {
		diffI := abs(candidates[i].Line - line)
		diffJ := abs(candidates[j].Line - line)
		return diffI < diffJ
	})

	best := candidates[0]
	x, y := d.toPDFCoords(best.H, best.V)

	return &ViewResult{
		Page: best.Page,
		X:    x,
		Y:    y,
		File: d.Files[best.Tag],
		Line: best.Line,
	}, nil
}

func (d *SyncTeXData) ReverseSearch(page int, x, y float64) (*EditResult, error) {
	h, v := d.fromPDFCoords(x, y)

	nodes, ok := d.Pages[page]
	if !ok {
		return nil, fmt.Errorf("page %d not found in synctex data", page)
	}

	var best *Node
	bestDist := math.MaxFloat64

	for _, node := range nodes {
		if node.Tag == 0 || node.Line == 0 {
			continue
		}

		nodeH := node.H
		nodeV := node.V
		nodeW := node.Width
		nodeHt := node.Height

		left := nodeH
		right := nodeH + nodeW
		top := nodeV - nodeHt
		bottom := nodeV

		if left > right {
			left, right = right, left
		}
		if top > bottom {
			top, bottom = bottom, top
		}

		inBox := h >= left && h <= right && v >= top && v <= bottom

		var dist float64
		if inBox {
			dist = 0
		} else {
			dx := 0.0
			dy := 0.0
			if h < left {
				dx = left - h
			} else if h > right {
				dx = h - right
			}
			if v < top {
				dy = top - v
			} else if v > bottom {
				dy = v - bottom
			}
			dist = dx*dx + dy*dy
		}

		if dist < bestDist {
			bestDist = dist
			best = node
		}
	}

	if best == nil {
		return nil, fmt.Errorf("no node found near (%.2f, %.2f) on page %d", x, y, page)
	}

	filename := d.Files[best.Tag]

	return &EditResult{
		File: filename,
		Line: best.Line,
		Col:  best.Column,
	}, nil
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

type cachedEntry struct {
	data  *SyncTeXData
	mtime time.Time
}

var (
	synctexFileCache   = make(map[string]*cachedEntry)
	synctexFileCacheMu sync.RWMutex
)

func GetCachedSyncTeX(path string) (*SyncTeXData, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("failed to stat synctex file: %w", err)
	}
	mtime := info.ModTime()

	synctexFileCacheMu.RLock()
	if entry, ok := synctexFileCache[path]; ok && entry.mtime.Equal(mtime) {
		data := entry.data
		synctexFileCacheMu.RUnlock()
		return data, nil
	}
	synctexFileCacheMu.RUnlock()

	data, err := ParseSyncTeXGz(path)
	if err != nil {
		return nil, err
	}

	synctexFileCacheMu.Lock()
	synctexFileCache[path] = &cachedEntry{data: data, mtime: mtime}
	if len(synctexFileCache) > 100 {
		for k := range synctexFileCache {
			delete(synctexFileCache, k)
			if len(synctexFileCache) <= 50 {
				break
			}
		}
	}
	synctexFileCacheMu.Unlock()

	return data, nil
}
